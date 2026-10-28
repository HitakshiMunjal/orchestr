const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["venue", "equipment"],
      required: true,
    },
    building: {
      type: String,
      default: "Main Block",
    },
    // For venues: physical seating capacity; for equipment: unit count
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    inchargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ type: 1, capacity: -1 });

module.exports = mongoose.model("Resource", resourceSchema);
