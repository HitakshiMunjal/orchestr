const crypto = require("crypto");
const { EventBooking } = require("../models/EventBooking");
const Registration = require("../models/Registration");
const { runInTransaction } = require("../config/transactions");
const { httpError } = require("../utils/httpError");

function generateQrToken() {
  return crypto.randomBytes(20).toString("hex");
}

/**
 * Concurrency-safe registration using a MongoDB transaction + atomic $expr seat check.
 * (On standalone MongoDB the atomic $expr claim alone guarantees no overbooking,
 * and a compensating decrement runs if the ticket write fails.)
 */
async function registerStudentForEvent(eventId, studentId) {
  return runInTransaction(async (session) => {
    // 1. Check if already registered
    const existing = await Registration.findOne({ eventId, studentId }).session(session);
    if (existing && existing.status !== "CANCELLED") {
      throw httpError(409, `Already registered with status: ${existing.status}`);
    }
    // Re-registering after a cancellation: drop the old record so the unique
    // { eventId, studentId } index allows a fresh row (and a fresh FIFO position)
    if (existing) {
      await Registration.deleteOne({ _id: existing._id }, { session });
    }

    // 2. Atomically claim 1 confirmed seat ONLY IF status === "APPROVED_OPEN" and confirmedCount < requestedSeats
    const claimedEvent = await EventBooking.findOneAndUpdate(
      {
        _id: eventId,
        status: "APPROVED_OPEN",
        $expr: { $lt: ["$confirmedCount", "$requestedSeats"] },
      },
      { $inc: { confirmedCount: 1 } },
      { new: true, session }
    );

    if (claimedEvent) {
      try {
        const [registration] = await Registration.create(
          [
            {
              eventId,
              studentId,
              status: "CONFIRMED",
              qrToken: generateQrToken(),
            },
          ],
          { session }
        );
        return { registration, seatStatus: "CONFIRMED" };
      } catch (err) {
        // Without a transaction, release the seat we just claimed
        if (!session) {
          await EventBooking.updateOne({ _id: eventId }, { $inc: { confirmedCount: -1 } });
        }
        throw err;
      }
    }

    // 3. If atomic claim returned null, verify whether the event is APPROVED_OPEN (full) vs not open at all
    const eventDoc = await EventBooking.findById(eventId).session(session);
    if (!eventDoc) {
      throw httpError(404, "Event not found");
    }
    if (eventDoc.status !== "APPROVED_OPEN") {
      throw httpError(403, `Registrations are not open (Current status: ${eventDoc.status})`);
    }

    // Event is APPROVED_OPEN and at full capacity -> place on FIFO Waitlist
    const [waitlistedReg] = await Registration.create(
      [
        {
          eventId,
          studentId,
          status: "WAITLISTED",
          qrToken: null,
        },
      ],
      { session }
    );

    return { registration: waitlistedReg, seatStatus: "WAITLISTED" };
  });
}

/**
 * Cancels a student's registration and atomically promotes the oldest WAITLISTED student (FIFO).
 */
async function cancelRegistrationAndPromote(registrationId, studentId) {
  return runInTransaction(async (session) => {
    const reg = await Registration.findOne({ _id: registrationId, studentId }).session(session);
    if (!reg) {
      throw httpError(404, "Registration not found");
    }
    if (["CANCELLED", "CHECKED_IN", "NO_SHOW"].includes(reg.status)) {
      throw httpError(400, `Cannot cancel registration in status: ${reg.status}`);
    }

    const wasConfirmed = reg.status === "CONFIRMED";
    reg.status = "CANCELLED";
    reg.qrToken = null;
    reg.cancelledAt = new Date();
    await reg.save({ session });

    let promotedStudent = null;

    if (wasConfirmed) {
      // Promote the earliest WAITLISTED registration in FIFO order
      promotedStudent = await Registration.findOneAndUpdate(
        { eventId: reg.eventId, status: "WAITLISTED" },
        {
          status: "CONFIRMED",
          qrToken: generateQrToken(),
          promotedFromWaitlistAt: new Date(),
        },
        { sort: { createdAt: 1 }, new: true, session }
      );

      // If no one was waiting on the waitlist, free the confirmed seat count on the event
      if (!promotedStudent) {
        await EventBooking.findByIdAndUpdate(
          reg.eventId,
          { $inc: { confirmedCount: -1 } },
          { session }
        );
      }
    }

    return { cancelledRegistration: reg, promotedStudent };
  });
}

module.exports = {
  registerStudentForEvent,
  cancelRegistrationAndPromote,
  generateQrToken,
};
