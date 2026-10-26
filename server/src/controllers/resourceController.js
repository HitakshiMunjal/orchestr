const { db } = require('../config/db');
const { sweepUnclaimedSlots } = require('../services/cronService');

/**
 * Get all campus resources (rooms and gear)
 */
async function getResources(req, res) {
  try {
    const { type, category, tier } = req.query;
    const query = {};
    if (type) query.type = type.toUpperCase();
    if (category) query.category = category.toUpperCase();
    if (tier) query.tier = tier.toUpperCase();

    const resources = await db.resources.find(query);
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campus resources catalog' });
  }
}

/**
 * Create a new campus resource (Admin / Lab Manager)
 */
async function createResource(req, res) {
  try {
    const { name, type, category, tier, capacity, location, description, specs, imageUrl } = req.body;
    
    if (!name || !type || !category || !tier || !location) {
      return res.status(400).json({ error: 'Missing required resource fields.' });
    }

    const resource = await db.resources.create({
      name,
      type: type.toUpperCase(),
      category: category.toUpperCase(),
      tier: tier.toUpperCase(),
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      location,
      description: description || '',
      specs: Array.isArray(specs) ? specs : (specs ? specs.split(',') : []),
      requiresApproval: tier.toUpperCase() === 'RESTRICTED',
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500'
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CREATE_RESOURCE',
      targetType: 'RESOURCE',
      targetId: resource.id,
      targetName: resource.name,
      details: `Created new ${tier} ${type} resource: ${name} at ${location}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, resource });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create resource' });
  }
}

/**
 * Get bookings list with optional filter
 */
async function getBookings(req, res) {
  try {
    const { resourceId, status, bookedByUserId } = req.query;
    const query = {};
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;
    if (bookedByUserId) query.bookedByUserId = bookedByUserId;

    const bookings = await db.bookings.find(query);
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

/**
 * Create a new booking request:
 * - Checks for overlapping hours with 30-minute cleanup buffer!
 * - Tiered auto-approval: Basic rooms/gear auto-approved immediately;
 *   Restricted resources set to PENDING for Lab Manager approval.
 */
async function createBooking(req, res) {
  try {
    const { resourceId, purpose, startTime, endTime } = req.body;

    if (!resourceId || !purpose || !startTime || !endTime) {
      return res.status(400).json({ error: 'Please provide resource, purpose, start time, and end time.' });
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid time window. End time must be after start time.' });
    }

    const resource = await db.resources.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Requested resource not found.' });
    }

    const bufferMs = (resource.cleanupBufferMinutes || 30) * 60 * 1000; // 30 minutes

    // Conflict Check against existing APPROVED or PENDING bookings for the same resource
    const existingBookings = await db.bookings.find({
      resourceId,
      status: { $in: ['APPROVED', 'PENDING', 'CHECKED_IN'] }
    });

    for (const bkg of existingBookings) {
      const bkgStart = new Date(bkg.startTime).getTime();
      const bkgEnd = new Date(bkg.endTime).getTime();

      // Enforce 30-minute cleanup buffer:
      // A booking window effectively spans [bkgStart, bkgEnd + bufferMs]
      // Conflict condition:
      // reqStart < (bkgEnd + bufferMs) AND (reqEnd + bufferMs) > bkgStart
      const hasConflict = start < (bkgEnd + bufferMs) && (end + bufferMs) > bkgStart;

      if (hasConflict) {
        const bkgStartFormatted = new Date(bkg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bkgEndFormatted = new Date(bkg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bufferEndFormatted = new Date(bkgEnd + bufferMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return res.status(409).json({
          error: 'TIME_SLOT_CONFLICT',
          message: `Slot Conflict: "${resource.name}" is already reserved for "${bkg.purpose}" from ${bkgStartFormatted} to ${bkgEndFormatted} (+ mandatory 30-min cleanup buffer until ${bufferEndFormatted}).`,
          conflictingBooking: bkg
        });
      }
    }

    // Tiered Approval Workflow:
    // Basic rooms/gear auto-approve; Restricted resources require manual Faculty/Manager approval.
    const isAutoApproved = resource.tier === 'BASIC';
    const status = isAutoApproved ? 'APPROVED' : 'PENDING';
    const approvalReason = isAutoApproved ? 'Auto-approved (Standard basic campus resource policy)' : undefined;
    const approvedBy = isAutoApproved ? 'System Auto-Approval Engine' : undefined;
    const approvedAt = isAutoApproved ? new Date().toISOString() : undefined;
    
    // Auto-release deadline: 20 minutes after start time
    const autoReleaseDeadline = new Date(start + 20 * 60 * 1000).toISOString();

    const booking = await db.bookings.create({
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      bookedByUserId: req.user.id,
      bookedByUserName: req.user.name,
      bookedByUserEmail: req.user.email,
      purpose,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      status,
      approvalReason,
      approvedBy,
      approvedAt,
      autoReleaseDeadline,
      createdAt: new Date().toISOString()
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: isAutoApproved ? 'AUTO_APPROVE_BOOKING' : 'REQUEST_BOOKING',
      targetType: 'BOOKING',
      targetId: booking.id,
      targetName: resource.name,
      details: `${req.user.name} booked ${resource.name} for "${purpose}". Status: ${status} (${resource.tier} tier)`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      booking,
      autoApproved: isAutoApproved,
      message: isAutoApproved
        ? `Booking confirmed and auto-approved for ${resource.name}!`
        : `Booking request submitted. Awaiting approval from ${resource.approverRole.replace('_', ' ')}.`
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create resource booking' });
  }
}

/**
 * Approve a pending booking (Resource Manager / Admin)
 */
async function approveBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason = 'Approved by Facility Manager' } = req.body;

    const booking = await db.bookings.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve booking with status ${booking.status}` });
    }

    const updated = await db.bookings.findByIdAndUpdate(id, {
      $set: {
        status: 'APPROVED',
        approvalReason: reason,
        approvedBy: req.user.name,
        approvedAt: new Date().toISOString()
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'APPROVE_BOOKING',
      targetType: 'BOOKING',
      targetId: booking.id,
      targetName: booking.resourceName,
      details: `${req.user.name} approved booking for ${booking.resourceName}. Note: ${reason}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, booking: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve booking' });
  }
}

/**
 * Reject a pending booking (Resource Manager / Admin)
 */
async function rejectBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason = 'Requested schedule conflicts with lab maintenance schedule' } = req.body;

    const booking = await db.bookings.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await db.bookings.findByIdAndUpdate(id, {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedBy: req.user.name,
        approvedAt: new Date().toISOString()
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REJECT_BOOKING',
      targetType: 'BOOKING',
      targetId: booking.id,
      targetName: booking.resourceName,
      details: `${req.user.name} rejected booking for ${booking.resourceName}. Reason: ${reason}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, booking: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject booking' });
  }
}

/**
 * Organizer checks in to claimed room slot (prevents 20-min auto-release!)
 */
async function checkinBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'AUTO_RELEASED') {
      return res.status(410).json({ error: 'Slot already auto-released due to missing the 20-minute check-in deadline.' });
    }

    const updated = await db.bookings.findByIdAndUpdate(id, {
      $set: {
        checkedInAt: new Date().toISOString(),
        status: 'CHECKED_IN'
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'VENUE_CHECK_IN',
      targetType: 'BOOKING',
      targetId: booking.id,
      targetName: booking.resourceName,
      details: `Organizer checked into ${booking.resourceName}. Slot confirmed active; auto-release cancelled.`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, booking: updated, message: `Checked into ${booking.resourceName} successfully!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check in to booking' });
  }
}

/**
 * Trigger manual auto-release sweep (Useful for testing the 20-minute unclaimed slot auto-release)
 */
async function triggerSweep(req, res) {
  try {
    const released = await sweepUnclaimedSlots(db);
    res.json({
      success: true,
      releasedCount: released.length,
      releasedBookings: released,
      message: `Auto-release sweep executed: ${released.length} unclaimed room slots released back to campus catalog.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute auto-release sweep' });
  }
}

/**
 * Equipment Checkout Logs (Manager / Admin)
 */
async function getCheckoutLogs(req, res) {
  try {
    const logs = await db.checkoutLogs.find();
    res.json({ checkoutLogs: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment checkout logs' });
  }
}

/**
 * Check out physical gear
 */
async function checkoutGear(req, res) {
  try {
    const { resourceId, userId, expectedReturnTime } = req.body;

    const resource = await db.resources.findById(resourceId);
    if (!resource || resource.type !== 'EQUIPMENT') {
      return res.status(400).json({ error: 'Resource is not a valid equipment asset.' });
    }

    const borrower = await db.users.findById(userId);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower student/organizer not found.' });
    }

    const log = await db.checkoutLogs.create({
      bookingId: `chk_${Date.now()}`,
      resourceId: resource.id,
      resourceName: resource.name,
      userId: borrower.id,
      userName: borrower.name,
      userEmail: borrower.email,
      checkedOutAt: new Date().toISOString(),
      checkedOutBy: req.user.name,
      expectedReturnTime: new Date(expectedReturnTime).toISOString(),
      actualReturnTime: null,
      conditionOnReturn: null,
      status: 'CHECKED_OUT'
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'EQUIPMENT_CHECKOUT',
      targetType: 'RESOURCE',
      targetId: resource.id,
      targetName: resource.name,
      details: `${resource.name} checked out to ${borrower.name} (${borrower.email}) until ${new Date(expectedReturnTime).toLocaleString()}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check out equipment' });
  }
}

/**
 * Return physical gear: log condition (Good, Damaged, Late) + damage notes
 */
async function returnGear(req, res) {
  try {
    const { id } = req.params;
    const { conditionOnReturn = 'Good', damageNotes } = req.body;

    const log = await db.checkoutLogs.findById(id);
    if (!log) {
      return res.status(404).json({ error: 'Checkout record not found' });
    }

    const now = new Date();
    const isLate = conditionOnReturn === 'Late' || now > new Date(log.expectedReturnTime);
    const finalCondition = conditionOnReturn === 'Damaged' ? 'Damaged' : (isLate ? 'Late' : 'Good');

    const updated = await db.checkoutLogs.findByIdAndUpdate(id, {
      $set: {
        actualReturnTime: now.toISOString(),
        conditionOnReturn: finalCondition,
        damageNotes: damageNotes || (finalCondition === 'Damaged' ? 'Hardware damage reported during return check.' : 'Standard return.'),
        status: 'RETURNED'
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'EQUIPMENT_RETURN',
      targetType: 'RESOURCE',
      targetId: log.resourceId,
      targetName: log.resourceName,
      details: `${log.resourceName} returned by ${log.userName}. Condition: ${finalCondition}. Notes: ${damageNotes || 'None'}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, log: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process equipment return' });
  }
}

module.exports = {
  getResources,
  createResource,
  getBookings,
  createBooking,
  approveBooking,
  rejectBooking,
  checkinBooking,
  triggerSweep,
  getCheckoutLogs,
  checkoutGear,
  returnGear
};
