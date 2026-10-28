const { EventBooking } = require("../models/EventBooking");
const Registration = require("../models/Registration");
const {
  registerStudentForEvent,
  cancelRegistrationAndPromote,
} = require("../services/registrationService");
const { createCertificateReadableStream } = require("../services/certificateStream");
const auditBus = require("../services/auditBus");

// POST /api/events/:eventId/register
async function registerForEvent(req, res, next) {
  try {
    const result = await registerStudentForEvent(req.params.eventId, req.user._id);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/registrations/:id/cancel
async function cancelMyRegistration(req, res, next) {
  try {
    const result = await cancelRegistrationAndPromote(req.params.id, req.user._id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/registrations/me — Student's tickets (with live FIFO waitlist position)
async function listMyRegistrations(req, res, next) {
  try {
    const registrations = await Registration.find({ studentId: req.user._id })
      .populate({
        path: "eventId",
        select: "title clubName startTime endTime status requestedSeats confirmedCount venueId",
        populate: { path: "venueId", select: "name building" },
      })
      .sort({ createdAt: -1 })
      .lean();

    await Promise.all(
      registrations
        .filter((r) => r.status === "WAITLISTED")
        .map(async (r) => {
          const ahead = await Registration.countDocuments({
            eventId: r.eventId?._id || r.eventId,
            status: "WAITLISTED",
            createdAt: { $lt: r.createdAt },
          });
          r.waitlistPosition = ahead + 1;
        })
    );

    return res.json({ registrations });
  } catch (err) {
    next(err);
  }
}

// GET /api/events/:eventId/registrations — Organizer door roster (QR tokens never exposed)
async function listEventRegistrations(req, res, next) {
  try {
    const event = await EventBooking.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    const allowed =
      event.organizerId.equals(req.user._id) || ["osa_dean", "admin"].includes(req.user.role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden: Not the organizer of this event" });
    }

    const registrations = await Registration.find({ eventId: event._id })
      .select("-qrToken")
      .populate("studentId", "name email department")
      .sort({ createdAt: 1 });

    return res.json({ registrations });
  } catch (err) {
    next(err);
  }
}

// POST /api/events/:eventId/checkin — Verified Door QR Check-In
async function doorCheckIn(req, res, next) {
  try {
    const { eventId } = req.params;
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ error: "qrToken is required" });
    }

    const event = await EventBooking.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Rule 3A: Verify the scanning user is the authorized organizer of this event (or admin/dean)
    const isAuthorizedScanner =
      event.organizerId.equals(req.user._id) ||
      ["osa_dean", "admin"].includes(req.user.role);

    if (!isAuthorizedScanner) {
      return res.status(403).json({
        error: "Forbidden: Only the authorized event organizer can scan tickets for this event",
      });
    }

    if (event.status !== "APPROVED_OPEN") {
      return res.status(400).json({
        error: `Door check-in is only available for APPROVED_OPEN events (current: ${event.status})`,
      });
    }

    // Rule 3B: Verify the registration belongs to THIS specific eventId and matches qrToken
    const registration = await Registration.findOne({
      eventId: event._id,
      qrToken: String(qrToken).trim(),
    }).populate("studentId", "name email department");

    if (!registration) {
      return res.status(404).json({
        error: "Invalid QR token or ticket does not belong to this event",
      });
    }

    // Duplicate-Scan Prevention
    if (registration.status === "CHECKED_IN") {
      return res.status(409).json({
        error: "DUPLICATE_SCAN_BLOCKED: Ticket has already been scanned",
        checkedInAt: registration.checkedInAt,
        student: registration.studentId,
      });
    }

    if (registration.status !== "CONFIRMED") {
      return res.status(400).json({
        error: `Ticket cannot be checked in from status: ${registration.status}`,
      });
    }

    registration.status = "CHECKED_IN";
    registration.checkedInAt = new Date();
    registration.checkedInBy = req.user._id;
    await registration.save();

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "QR_DOOR_CHECKIN_VERIFIED",
      targetModel: "Registration",
      targetId: registration._id,
      previousStatus: "CONFIRMED",
      newStatus: "CHECKED_IN",
      metadata: { eventId: event._id, studentId: registration.studentId._id },
    });

    return res.json({
      message: "Check-in verified",
      registration,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/registrations/:id/certificate — Backend-verified Attendance Certificate Stream
async function downloadCertificate(req, res, next) {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate("studentId", "name email department")
      .populate({
        path: "eventId",
        populate: { path: "venueId", select: "name" },
      });

    if (!registration) {
      return res.status(404).json({ error: "Registration record not found" });
    }

    // Explicit Access Check: Attending student OR authorized admin/osa_dean
    const isOwnerStudent =
      req.user.role === "student" &&
      registration.studentId._id.equals(req.user._id);
    const isAdminOrDean = ["osa_dean", "admin"].includes(req.user.role);

    if (!isOwnerStudent && !isAdminOrDean) {
      return res.status(403).json({
        error: "Forbidden: Certificates are restricted to the attending student or authorized administration",
      });
    }

    // Independent Backend Verification: Never trust client state; status MUST be CHECKED_IN
    if (registration.status !== "CHECKED_IN") {
      return res.status(403).json({
        error: `Certificate unavailable: Attendance not verified (Current status: ${registration.status})`,
      });
    }

    const filename = `Certificate-${registration.eventId.title.replace(/\s+/g, "_")}-${registration._id}.txt`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const stream = createCertificateReadableStream({
      registration,
      student: registration.studentId,
      event: registration.eventId,
      venueName: registration.eventId.venueId?.name || "Campus Venue",
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerForEvent,
  cancelMyRegistration,
  listMyRegistrations,
  listEventRegistrations,
  doorCheckIn,
  downloadCertificate,
};
