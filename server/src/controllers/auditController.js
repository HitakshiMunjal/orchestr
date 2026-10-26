const { db } = require('../config/db');

/**
 * Get Immutable Audit Logs (Filterable by Actor, Action, Target, Date)
 */
async function getAuditLogs(req, res) {
  try {
    const { action, targetType, actorId, search } = req.query;
    let logs = await db.auditLogs.find();

    // Sort newest first
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (action) {
      logs = logs.filter(l => l.action === action);
    }
    if (targetType) {
      logs = logs.filter(l => l.targetType === targetType);
    }
    if (actorId) {
      logs = logs.filter(l => l.actorId === actorId);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.details.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        (l.targetName && l.targetName.toLowerCase().includes(q))
      );
    }

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch immutable audit logs' });
  }
}

/**
 * Admin Revoke Strike:
 * Decrements strike count, unblocks student if applicable, records audit log
 */
async function revokeStrike(req, res) {
  try {
    const { userId, strikeId, reason = 'Administrative leniency / Medical verification presented' } = req.body;

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Student user not found' });
    }

    const newStrikes = Math.max(0, (user.strikes || 0) - 1);
    const updatedHistory = (user.strikeHistory || []).map(strk => {
      if (strk.id === strikeId) {
        return { ...strk, revokedAt: new Date().toISOString(), revokedReason: reason };
      }
      return strk;
    });

    const isUnblocked = newStrikes < 3;

    const updatedUser = await db.users.findByIdAndUpdate(userId, {
      $set: {
        strikes: newStrikes,
        strikeHistory: updatedHistory,
        isBlockedUntil: isUnblocked ? null : user.isBlockedUntil
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REVOKE_STRIKE',
      targetType: 'STRIKE',
      targetId: userId,
      targetName: user.name,
      details: `${req.user.name} revoked strike for ${user.name}. New strike count: ${newStrikes}. Reason: ${reason}. ${isUnblocked ? 'Student registration privileges restored.' : ''}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      user: updatedUser,
      message: `Strike revoked for ${user.name}. Current strikes: ${newStrikes}.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke strike' });
  }
}

/**
 * Admin Issue Manual Strike
 */
async function issueStrike(req, res) {
  try {
    const { userId, reason, eventTitle = 'Administrative Disciplinary Action' } = req.body;

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Student user not found' });
    }

    const newStrikes = (user.strikes || 0) + 1;
    const strikeRecord = {
      id: `strk_manual_${Date.now()}`,
      eventId: 'manual_override',
      eventTitle,
      reason: reason || 'Manual strike issued by Campus Administration.',
      issuedAt: new Date().toISOString(),
      issuedBy: req.user.name
    };

    const updateData = {
      $inc: { strikes: 1 },
      $push: { strikeHistory: strikeRecord }
    };

    let suspended = false;
    if (newStrikes >= 3) {
      updateData.$set = {
        isBlockedUntil: new Date(Date.now() + 14 * 86400000).toISOString()
      };
      suspended = true;
    }

    const updatedUser = await db.users.findByIdAndUpdate(userId, updateData);

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'ISSUE_STRIKE_MANUAL',
      targetType: 'STRIKE',
      targetId: userId,
      targetName: user.name,
      details: `${req.user.name} issued manual strike to ${user.name}. New strikes: ${newStrikes}. Reason: ${reason}. ${suspended ? 'SUSPENDED: 3-strike threshold crossed.' : ''}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      user: updatedUser,
      message: `Strike issued to ${user.name}. Current strikes: ${newStrikes}.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to issue manual strike' });
  }
}

/**
 * Manual Attendance Override:
 * Admin / Manager manually marks a student as checked-in (with mandatory audit log note)
 */
async function overrideAttendance(req, res) {
  try {
    const { registrationId, reason = 'Student showed valid campus physical ID at registration desk' } = req.body;

    const registration = await db.registrations.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const updated = await db.registrations.findByIdAndUpdate(registrationId, {
      $set: {
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: `Admin Override (${req.user.name})`,
        status: 'ATTENDED'
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'OVERRIDE_ATTENDANCE',
      targetType: 'REGISTRATION',
      targetId: registration.id,
      targetName: registration.userName,
      details: `${req.user.name} manually overrode attendance for ${registration.userName} on event "${registration.eventTitle}". Note: ${reason}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, registration: updated, message: `Attendance manually verified for ${registration.userName}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to override attendance' });
  }
}

module.exports = {
  getAuditLogs,
  revokeStrike,
  issueStrike,
  overrideAttendance
};
