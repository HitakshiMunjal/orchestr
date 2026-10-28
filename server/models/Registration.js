const mongoose = require("mongoose");

const REGISTRATION_STATUSES = [
  "CONFIRMED",
  "WAITLISTED",
  "CHECKED_IN",
  "NO_SHOW",
  "CANCELLED",
];

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBooking",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: REGISTRATION_STATUSES,
      required: true,
    },
    // Cryptographic token generated only for CONFIRMED / CHECKED_IN registrations
    qrToken: {
      type: String,
      default: null,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    promotedFromWaitlistAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate registration for the same event by the same student
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

// FIFO Waitlist lookup index (oldest createdAt promoted first)
registrationSchema.index({ eventId: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("Registration", registrationSchema);
