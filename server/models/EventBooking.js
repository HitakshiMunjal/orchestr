const mongoose = require("mongoose");

const BOOKING_STATUSES = [
  "PENDING_INCHARGE",
  "PENDING_OSA_DEAN",
  "APPROVED_OPEN",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

// Statuses that actively hold the room & equipment against overlapping requests
const ACTIVE_HOLD_STATUSES = ["PENDING_INCHARGE", "PENDING_OSA_DEAN", "APPROVED_OPEN"];

const eventBookingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    clubName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    equipmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    bufferMinutes: {
      type: Number,
      default: 15,
    },
    bufferEndTime: {
      type: Date,
      required: true,
    },
    // Permitted seat limit requested by organizer (must be <= venue.capacity)
    requestedSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    // Atomically incremented under concurrency when students register
    confirmedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "PENDING_INCHARGE",
    },
    inchargeApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      remarks: { type: String, default: "" },
    },
    deanApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      remarks: { type: String, default: "" },
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    posterUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Automatically compute bufferEndTime = endTime + bufferMinutes before validation
eventBookingSchema.pre("validate", function (next) {
  if (this.startTime && this.endTime) {
    if (this.endTime <= this.startTime) {
      return next(new Error("endTime must be strictly after startTime"));
    }
    const bufferMs = (this.bufferMinutes ?? 15) * 60 * 1000;
    this.bufferEndTime = new Date(this.endTime.getTime() + bufferMs);
  }
  next();
});

// Compound index for interval overlap conflict queries
eventBookingSchema.index({ venueId: 1, status: 1, startTime: 1, bufferEndTime: 1 });
eventBookingSchema.index({ equipmentIds: 1, status: 1, startTime: 1, bufferEndTime: 1 });

const EventBooking = mongoose.model("EventBooking", eventBookingSchema);

module.exports = {
  EventBooking,
  BOOKING_STATUSES,
  ACTIVE_HOLD_STATUSES,
};
