const { db } = require('../config/db');

/**
 * Get all events with optional filters
 */
async function getEvents(req, res) {
  try {
    const { status, category, organizerId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (organizerId) query.organizerId = organizerId;

    const events = await db.events.find(query);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

/**
 * Get single event by ID
 */
async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const event = await db.events.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get registration stats
    const registrations = await db.registrations.find({ eventId: id });
    const confirmed = registrations.filter(r => r.status === 'CONFIRMED' || r.status === 'ATTENDED');
    const waitlisted = registrations.filter(r => r.status === 'WAITLISTED');

    res.json({
      event: {
        ...event,
        registeredCount: confirmed.length,
        waitlistCount: waitlisted.length
      },
      registrations
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
}

/**
 * Create a new event (Club Organizer / Admin):
 * - ROOM-LINKED CAPACITY LIMIT: Max registrations is automatically capped to match
 *   the seating capacity of the booked venue!
 */
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      clubName,
      resourceId,
      startTime,
      endTime,
      category = 'WORKSHOP',
      prerequisites = [],
      dualScanRequired = false,
      coverImage,
      tags = []
    } = req.body;

    if (!title || !description || !resourceId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required event fields (title, description, venue resource, start/end time).' });
    }

    // Fetch the venue resource to inherit seating capacity
    const venue = await db.resources.findById(resourceId);
    if (!venue || venue.type !== 'ROOM') {
      return res.status(400).json({ error: 'Valid room venue must be selected for event.' });
    }

    // ROOM-LINKED CAPACITY: Capped to venue capacity!
    const venueCapacity = venue.capacity || 50;

    const event = await db.events.create({
      title,
      description,
      organizerId: req.user.id,
      organizerName: req.user.name,
      organizerEmail: req.user.email,
      clubName: clubName || 'Campus Tech Club',
      resourceId: venue.id,
      resourceName: venue.name,
      venueCapacity, // Room-linked capacity limit!
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      category,
      status: 'PUBLISHED',
      prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
      dualScanRequired: Boolean(dualScanRequired),
      registeredCount: 0,
      checkedInCount: 0,
      waitlistCount: 0,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',') : ['Campus', 'Event']),
      createdAt: new Date().toISOString()
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CREATE_EVENT',
      targetType: 'EVENT',
      targetId: event.id,
      targetName: event.title,
      details: `Created event "${title}" at ${venue.name}. Capacity automatically capped to ${venueCapacity} seats based on room limit. Dual scan: ${dualScanRequired}.`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      event,
      message: `Event "${title}" created successfully! Capacity locked to ${venueCapacity} seats (Venue: ${venue.name}).`
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
}

/**
 * Mark No-Shows & Issue Automated Strikes
 * Identifies confirmed students who did NOT check in to the completed event
 * and issues automated strikes! If student reaches 3 strikes, suspends them!
 */
async function markNoShows(req, res) {
  try {
    const { id } = req.params;
    const event = await db.events.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Find confirmed registrations that were NOT checked in
    const registrations = await db.registrations.find({
      eventId: id,
      status: 'CONFIRMED',
      checkedIn: false
    });

    const penalizedStudents = [];

    for (const reg of registrations) {
      // Update registration to NO_SHOW
      await db.registrations.findByIdAndUpdate(reg.id, {
        $set: { status: 'NO_SHOW' }
      });

      const user = await db.users.findById(reg.userId);
      if (user && user.role === 'STUDENT') {
        const newStrikeCount = (user.strikes || 0) + 1;
        const strikeRecord = {
          id: `strk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          eventId: event.id,
          eventTitle: event.title,
          reason: 'Automated No-Show Penalty: Registered seat occupied but student failed to check in.',
          issuedAt: new Date().toISOString(),
          issuedBy: 'Automated No-Show System'
        };

        const updateData = {
          $inc: { strikes: 1 },
          $push: { strikeHistory: strikeRecord }
        };

        // If student reaches 3 strikes, temporarily suspend them for 14 days!
        let suspended = false;
        if (newStrikeCount >= 3) {
          const blockDate = new Date(Date.now() + 14 * 86400000).toISOString();
          updateData.$set = { isBlockedUntil: blockDate };
          suspended = true;
        }

        await db.users.findByIdAndUpdate(user.id, updateData);

        await db.auditLogs.create({
          timestamp: new Date().toISOString(),
          actorId: 'system',
          actorName: 'Automated No-Show System',
          actorRole: 'SUPER_ADMIN',
          action: 'ISSUE_STRIKE',
          targetType: 'STRIKE',
          targetId: user.id,
          targetName: user.name,
          details: `Issued strike #${newStrikeCount} to ${user.name} for no-show at "${event.title}". ${suspended ? 'SUSPENDED: 3-strike threshold exceeded (14-day temporary registration ban).' : ''}`,
          ipAddress: '127.0.0.1'
        });

        penalizedStudents.push({
          userName: user.name,
          email: user.email,
          newStrikes: newStrikeCount,
          suspended
        });
      }
    }

    // Mark event completed
    await db.events.findByIdAndUpdate(id, { $set: { status: 'COMPLETED' } });

    res.json({
      success: true,
      penalizedCount: penalizedStudents.length,
      penalizedStudents,
      message: `Processed no-shows for "${event.title}": ${penalizedStudents.length} automated strikes issued.`
    });
  } catch (err) {
    console.error('Error marking no shows:', err);
    res.status(500).json({ error: 'Failed to process no-shows' });
  }
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  markNoShows
};
