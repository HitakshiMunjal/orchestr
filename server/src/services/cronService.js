const { signTicket } = require('../utils/crypto');

/**
 * Auto-Release Unclaimed Room Slots:
 * If an organizer doesn't check in within 20 minutes of start time,
 * the room booking is automatically cancelled and slot is freed!
 */
async function sweepUnclaimedSlots(db) {
  const now = new Date();
  const approvedBookings = await db.bookings.find({
    status: 'APPROVED',
    resourceType: 'ROOM'
  });

  const released = [];

  for (const bkg of approvedBookings) {
    if (!bkg.checkedInAt) {
      const deadline = new Date(bkg.autoReleaseDeadline || (new Date(bkg.startTime).getTime() + 20 * 60000));
      if (now > deadline) {
        // Auto release this booking!
        await db.bookings.findByIdAndUpdate(bkg.id, {
          $set: {
            status: 'AUTO_RELEASED',
            rejectionReason: 'Auto-released by Orchestr Engine: Organizer failed to check-in within 20 minutes of slot start time.'
          }
        });

        // Add Immutable Audit Log
        await db.auditLogs.create({
          timestamp: new Date().toISOString(),
          actorId: 'system',
          actorName: 'Unclaimed Slot Auto-Release Engine',
          actorRole: 'SUPER_ADMIN',
          action: 'AUTO_RELEASE_UNCLAIMED_SLOT',
          targetType: 'BOOKING',
          targetId: bkg.id,
          targetName: bkg.resourceName,
          details: `Booking for ${bkg.resourceName} auto-released. Start time was ${new Date(bkg.startTime).toLocaleTimeString()}, deadline was ${deadline.toLocaleTimeString()}. Slot is now open for campus booking.`,
          metadata: { bookingId: bkg.id, resourceId: bkg.resourceId }
        });

        released.push(bkg);
      }
    }
  }

  if (released.length > 0) {
    console.log(`⏱️ Auto-Release Sweep: Freed ${released.length} unclaimed room slots.`);
  }

  return released;
}

/**
 * Timed Waitlist Promotion (TTL) Expiry Worker:
 * When a seat opens, the #1 waitlisted student gets 30 minutes to claim it.
 * If expired, passes seat to #2 waitlisted student with a fresh 30-min window!
 */
async function sweepWaitlistTtl(db) {
  const now = new Date();
  
  // Find all waitlisted users whose promotion window has expired
  const expiredPromotions = await db.registrations.find({
    status: 'WAITLISTED',
    waitlistExpiresAt: { $lte: now.toISOString() }
  });

  const processed = [];

  for (const reg of expiredPromotions) {
    // Demote or mark expired for current student
    await db.registrations.findByIdAndUpdate(reg.id, {
      $set: {
        waitlistExpiresAt: null,
        waitlistPromotedAt: null,
        waitlistPosition: 999 // moved to back or expired
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: 'system',
      actorName: 'Waitlist TTL Worker',
      actorRole: 'SUPER_ADMIN',
      action: 'WAITLIST_TTL_EXPIRED',
      targetType: 'REGISTRATION',
      targetId: reg.id,
      targetName: reg.userName,
      details: `Waitlist claim window expired for ${reg.userName} on event "${reg.eventTitle}". Re-allocating slot to next in queue.`,
      metadata: { eventId: reg.eventId, userId: reg.userId }
    });

    // Find next student in line (#2)
    const nextInLine = await db.registrations.findOne({
      eventId: reg.eventId,
      status: 'WAITLISTED',
      id: { $ne: reg.id }
    });

    if (nextInLine) {
      const ttlDeadline = new Date(Date.now() + 30 * 60000).toISOString();
      await db.registrations.findByIdAndUpdate(nextInLine.id, {
        $set: {
          waitlistPosition: 1,
          waitlistPromotedAt: new Date().toISOString(),
          waitlistExpiresAt: ttlDeadline
        }
      });

      await db.auditLogs.create({
        timestamp: new Date().toISOString(),
        actorId: 'system',
        actorName: 'Waitlist TTL Worker',
        actorRole: 'SUPER_ADMIN',
        action: 'WAITLIST_PROMOTION',
        targetType: 'REGISTRATION',
        targetId: nextInLine.id,
        targetName: nextInLine.userName,
        details: `Promoted student ${nextInLine.userName} to Position #1 with 30-minute claim TTL countdown.`,
        metadata: { eventId: reg.eventId, userId: nextInLine.userId, expiresAt: ttlDeadline }
      });

      processed.push({ expired: reg, promotedNext: nextInLine });
    }
  }

  return processed;
}

/**
 * Start recurring background workers
 */
function startCronWorkers(db) {
  // Sweep unclaimed slots every 30 seconds
  setInterval(() => {
    sweepUnclaimedSlots(db).catch(err => console.error('Error in sweepUnclaimedSlots:', err));
  }, 30000);

  // Sweep waitlist TTL every 15 seconds
  setInterval(() => {
    sweepWaitlistTtl(db).catch(err => console.error('Error in sweepWaitlistTtl:', err));
  }, 15000);

  console.log('⏱️ Background Workers active: Auto-Release (30s) & Waitlist TTL Worker (15s)');
}

module.exports = {
  sweepUnclaimedSlots,
  sweepWaitlistTtl,
  startCronWorkers
};
