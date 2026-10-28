const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetModel: {
      type: String,
      enum: ["EventBooking", "Registration", "Resource", "User"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Immutability guards: Audit logs are append-only and cannot be deleted
auditLogSchema.pre("deleteOne", function (next) {
  next(new Error("Audit logs are immutable and cannot be deleted."));
});
auditLogSchema.pre("deleteMany", function (next) {
  next(new Error("Audit logs are immutable and cannot be deleted."));
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
