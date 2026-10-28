const { EventBooking, ACTIVE_HOLD_STATUSES } = require("../models/EventBooking");
const Resource = require("../models/Resource");
const Registration = require("../models/Registration");
const User = require("../models/User");
const { checkResourceConflicts } = require("../services/conflictService");
const auditBus = require("../services/auditBus");
const { runInTransaction } = require("../config/transactions");
const { httpError } = require("../utils/httpError");

const BOOKING_POPULATE = [
  { path: "venueId", select: "name capacity building inchargeId" },
  { path: "equipmentIds", select: "name type" },
  { path: "organizerId", select: "name email" },
  { path: "inchargeApproval.approvedBy", select: "name" },
  { path: "deanApproval.approvedBy", select: "name" },
];

// POST /api/bookings — Submit event & provisionally reserve venue + equipment
async function createEventBooking(req, res, next) {
  try {
    const {
      title,
      clubName,
      description,
      venueId,
      equipmentIds = [],
      startTime,
      endTime,
      requestedSeats,
      bufferMinutes = 15,
    } = req.body;

    if (!title || !clubName || !venueId || !startTime || !endTime) {
      throw httpError(400, "title, clubName, venueId, startTime and endTime are required");
    }

    const seats = Number(requestedSeats);
    const buffer = Number(bufferMinutes);
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw httpError(400, "startTime and endTime must be valid dates");
    }
    if (end <= start) {
      throw httpError(400, "endTime must be strictly after startTime");
    }
    if (start < new Date()) {
      throw httpError(400, "Cannot book a venue for a time in the past");
    }

    const bufferEnd = new Date(end.getTime() + buffer * 60 * 1000);

    const booking = await runInTransaction(async (session) => {
      const venue = await Resource.findOne({ _id: venueId, type: "venue", isActive: true }).session(
        session
      );
      if (!venue) {
        throw httpError(404, "Selected venue not found or inactive");
      }

      // Rule 2: Capacity is requestedSeats, strictly capped by venue.capacity
      if (!Number.isInteger(seats) || seats < 1 || seats > venue.capacity) {
        throw httpError(
          400,
          `requestedSeats (${requestedSeats}) must be between 1 and venue capacity (${venue.capacity})`
        );
      }

      if (equipmentIds.length > 0) {
        const found = await Resource.countDocuments({
          _id: { $in: equipmentIds },
          type: "equipment",
          isActive: true,
        }).session(session);
        if (found !== equipmentIds.length) {
          throw httpError(400, "One or more selected equipment items are invalid or inactive");
        }
      }

      // Provisional Hold Conflict Check across PENDING_INCHARGE, PENDING_OSA_DEAN, APPROVED_OPEN
      const conflict = await checkResourceConflicts({
        venueId,
        equipmentIds,
        startTime: start,
        bufferEndTime: bufferEnd,
        session,
      });

      if (conflict) {
        throw httpError(
          409,
          `Time-slot conflict with "${conflict.title}" (${conflict.clubName}) holding status [${conflict.status}]`,
          { conflictingBookingId: conflict._id }
        );
      }

      const [created] = await EventBooking.create(
        [
          {
            title,
            clubName,
            description,
            organizerId: req.user._id,
            venueId,
            equipmentIds,
            startTime: start,
            endTime: end,
            bufferMinutes: buffer,
            bufferEndTime: bufferEnd,
            requestedSeats: seats,
            status: "PENDING_INCHARGE",
          },
        ],
        { session }
      );
      return created;
    });

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "BOOKING_SUBMITTED_PROVISIONAL_HOLD",
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: null,
      newStatus: "PENDING_INCHARGE",
      metadata: { venueId, requestedSeats: seats, startTime: start, bufferEndTime: bufferEnd },
    });

    return res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/incharge-approve — Stage 1: Assigned In-Charge approves
async function inchargeApproveBooking(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id).populate("venueId");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "PENDING_INCHARGE") {
      return res.status(400).json({
        error: `Invalid state transition: In-Charge approval requires status PENDING_INCHARGE (current: ${booking.status})`,
      });
    }

    // Verify this In-Charge manages the requested venue (unless super admin)
    if (
      req.user.role !== "admin" &&
      !booking.venueId.inchargeId.equals(req.user._id)
    ) {
      return res.status(403).json({
        error: "Forbidden: You are not the assigned In-Charge for this venue",
      });
    }

    const prevStatus = booking.status;
    booking.status = "PENDING_OSA_DEAN";
    booking.inchargeApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: req.body.remarks || "Approved by Venue In-Charge",
    };
    await booking.save();

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "INCHARGE_APPROVED",
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: prevStatus,
      newStatus: "PENDING_OSA_DEAN",
    });

    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/dean-approve — Stage 2: OSA Dean final approval (Opens Registrations)
async function deanApproveBooking(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Strict sequence check: Must currently be in PENDING_OSA_DEAN
    if (booking.status !== "PENDING_OSA_DEAN") {
      return res.status(400).json({
        error: `Invalid state transition: OSA Dean approval requires status PENDING_OSA_DEAN (current: ${booking.status})`,
      });
    }

    const prevStatus = booking.status;
    booking.status = "APPROVED_OPEN";
    booking.deanApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: req.body.remarks || "Final venue lock approved by OSA Dean",
    };
    await booking.save();

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "OSA_DEAN_APPROVED_LOCKED",
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: prevStatus,
      newStatus: "APPROVED_OPEN",
    });

    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/cancel-or-reject — Releases provisional or approved reservation
async function rejectOrCancelBooking(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!ACTIVE_HOLD_STATUSES.includes(booking.status)) {
      return res.status(400).json({
        error: `Only active holds can be cancelled or rejected (current: ${booking.status})`,
      });
    }

    const isOrganizerOwner = booking.organizerId.equals(req.user._id);
    const isAuthority = ["incharge", "osa_dean", "admin"].includes(req.user.role);

    if (!isOrganizerOwner && !isAuthority) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // An In-Charge may only reject bookings for venues they manage
    if (!isOrganizerOwner && req.user.role === "incharge") {
      const venue = await Resource.findById(booking.venueId);
      if (!venue || !venue.inchargeId.equals(req.user._id)) {
        return res.status(403).json({
          error: "Forbidden: You are not the assigned In-Charge for this venue",
        });
      }
    }

    const prevStatus = booking.status;
    const nextStatus = isOrganizerOwner ? "CANCELLED" : "REJECTED";

    let cancelledRegistrationsCount = 0;

    await runInTransaction(async (session) => {
      booking.status = nextStatus;
      booking.rejectionReason = req.body.reason || "";
      if (prevStatus === "APPROVED_OPEN") {
        booking.confirmedCount = 0;
      }
      await booking.save({ session });

      // Cascading Registration Cancellation:
      // If the event was already APPROVED_OPEN, cancel all active student tickets (CONFIRMED or WAITLISTED)
      if (prevStatus === "APPROVED_OPEN") {
        const updateResult = await Registration.updateMany(
          {
            eventId: booking._id,
            status: { $in: ["CONFIRMED", "WAITLISTED"] },
          },
          {
            $set: {
              status: "CANCELLED",
              qrToken: null,
              cancelledAt: new Date(),
            },
          },
          { session }
        );
        cancelledRegistrationsCount =
          updateResult.modifiedCount ?? updateResult.nModified ?? 0;
      }
    });

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `BOOKING_${nextStatus}_SLOT_RELEASED`,
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: prevStatus,
      newStatus: nextStatus,
      metadata: {
        reason: booking.rejectionReason,
        cascadedRegistrationsCancelled: cancelledRegistrationsCount,
      },
    });

    return res.json({
      message: `Booking marked ${nextStatus}. Venue and equipment holds released.${
        cancelledRegistrationsCount > 0
          ? ` Cascaded cancellation to ${cancelledRegistrationsCount} registered student(s).`
          : ""
      }`,
      booking,
      cancelledRegistrationsCount,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/complete — Closes the event; unscanned CONFIRMED tickets become NO_SHOW
async function completeEvent(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id);
    if (!booking) throw httpError(404, "Booking not found");

    const isOwner = booking.organizerId.equals(req.user._id);
    if (!isOwner && !["osa_dean", "admin"].includes(req.user.role)) {
      throw httpError(403, "Forbidden: Only the event organizer can close this event");
    }
    if (booking.status !== "APPROVED_OPEN") {
      throw httpError(400, `Only APPROVED_OPEN events can be completed (current: ${booking.status})`);
    }

    const unscanned = await Registration.find({ eventId: booking._id, status: "CONFIRMED" }).select(
      "_id studentId"
    );
    if (unscanned.length > 0) {
      await Registration.updateMany(
        { _id: { $in: unscanned.map((r) => r._id) } },
        { $set: { status: "NO_SHOW", qrToken: null } }
      );
      await User.updateMany(
        { _id: { $in: unscanned.map((r) => r.studentId) } },
        { $inc: { noShowCount: 1 } }
      );
    }

    const prevStatus = booking.status;
    booking.status = "COMPLETED";
    await booking.save();

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "EVENT_COMPLETED",
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: prevStatus,
      newStatus: "COMPLETED",
      metadata: { noShowCount: unscanned.length },
    });

    return res.json({ booking, noShowCount: unscanned.length });
  } catch (err) {
    next(err);
  }
}

async function attachRegistrationStats(bookings) {
  if (bookings.length === 0) return bookings;
  const counts = await Registration.aggregate([
    { $match: { eventId: { $in: bookings.map((b) => b._id) } } },
    { $group: { _id: { eventId: "$eventId", status: "$status" }, n: { $sum: 1 } } },
  ]);
  const byEvent = {};
  for (const c of counts) {
    const key = String(c._id.eventId);
    byEvent[key] = byEvent[key] || {};
    byEvent[key][c._id.status] = c.n;
  }
  for (const b of bookings) {
    b.registrationStats = byEvent[String(b._id)] || {};
  }
  return bookings;
}

// GET /api/bookings?status=A,B&scope=mine|incharge
async function listBookings(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(",") };
    if (req.query.scope === "mine") filter.organizerId = req.user._id;
    if (req.query.scope === "incharge") {
      const managed = await Resource.find({ inchargeId: req.user._id, type: "venue" }).select("_id");
      filter.venueId = { $in: managed.map((v) => v._id) };
    }

    const bookings = await EventBooking.find(filter)
      .populate(BOOKING_POPULATE)
      .sort({ startTime: 1 })
      .lean();
    await attachRegistrationStats(bookings);
    return res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/:id
async function getBooking(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id).populate(BOOKING_POPULATE).lean();
    if (!booking) throw httpError(404, "Booking not found");
    await attachRegistrationStats([booking]);
    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bookings/:id (Admin only — permanently purge event and cascade registrations)
async function deleteEventBooking(req, res, next) {
  try {
    const booking = await EventBooking.findById(req.params.id);
    if (!booking) throw httpError(404, "Booking not found");

    // Cascading deletion: remove all student registrations/tickets tied to this event
    const regResult = await Registration.deleteMany({ eventId: booking._id });

    // Delete the booking record itself
    await EventBooking.findByIdAndDelete(booking._id);

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "BOOKING_PERMANENTLY_DELETED",
      targetModel: "EventBooking",
      targetId: booking._id,
      previousStatus: booking.status,
      newStatus: null,
      metadata: {
        title: booking.title,
        clubName: booking.clubName,
        cascadedRegistrationsDeleted: regResult.deletedCount || 0,
      },
    });

    return res.json({
      message: "Event and associated records permanently deleted",
      deletedBookingId: booking._id,
      registrationsDeleted: regResult.deletedCount || 0,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEventBooking,
  inchargeApproveBooking,
  deanApproveBooking,
  rejectOrCancelBooking,
  completeEvent,
  listBookings,
  getBooking,
  deleteEventBooking,
};
