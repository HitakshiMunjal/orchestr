const { EventBooking, ACTIVE_HOLD_STATUSES } = require("../models/EventBooking");

/**
 * Checks whether a requested venue or any requested equipment has an overlapping
 * active hold (PENDING_INCHARGE, PENDING_OSA_DEAN, or APPROVED_OPEN).
 *
 * Overlap condition: existing.startTime < newBufferEndTime AND existing.bufferEndTime > newStartTime
 */
async function checkResourceConflicts({
  venueId,
  equipmentIds = [],
  startTime,
  bufferEndTime,
  excludeBookingId = null,
  session = null,
}) {
  const resourceOrConditions = [{ venueId }];
  if (equipmentIds.length > 0) {
    resourceOrConditions.push({ equipmentIds: { $in: equipmentIds } });
  }

  const query = {
    status: { $in: ACTIVE_HOLD_STATUSES },
    $or: resourceOrConditions,
    startTime: { $lt: bufferEndTime },
    bufferEndTime: { $gt: startTime },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await EventBooking.findOne(query)
    .populate("venueId", "name")
    .populate("equipmentIds", "name")
    .session(session);

  return conflictingBooking;
}

module.exports = { checkResourceConflicts };
