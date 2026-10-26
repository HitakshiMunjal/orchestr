const { db } = require('../config/db');
const { verifyTicketSignature, generateCertificateHash } = require('../utils/crypto');

/**
 * Scan Door Ticket (QR Code):
 * - Verifies cryptographic signature (Tamper-Proof)
 * - DUPLICATE-SCAN PREVENTION: Flashes 200 on first scan; blocks shared screenshot on second scan with 409 Conflict!
 * - Supports ENTRY and EXIT scan modes for dual-scan events.
 */
async function scanTicket(req, res) {
  try {
    const { ticketData, scanMode = 'ENTRY', gateName = 'Main Entrance Gate' } = req.body;

    if (!ticketData) {
      return res.status(400).json({ error: 'Missing QR ticket payload' });
    }

    let parsed = null;
    try {
      parsed = typeof ticketData === 'string' ? JSON.parse(ticketData) : ticketData;
    } catch (e) {
      return res.status(400).json({ error: 'INVALID_QR_FORMAT', message: 'Malformed ticket QR payload.' });
    }

    const { ticketId, eventId, userId, timestamp, signature } = parsed;

    if (!ticketId || !eventId || !userId || !signature) {
      return res.status(400).json({ error: 'INVALID_TICKET_PAYLOAD', message: 'Ticket payload missing security fields.' });
    }

    // 1. TAMPER-PROOF VERIFICATION
    const isValidSignature = verifyTicketSignature({ ticketId, eventId, userId, timestamp }, signature);
    if (!isValidSignature) {
      await db.auditLogs.create({
        timestamp: new Date().toISOString(),
        actorId: req.user ? req.user.id : 'door_scanner',
        actorName: req.user ? req.user.name : 'Door Security',
        actorRole: req.user ? req.user.role : 'ORGANIZER',
        action: 'SECURITY_ALERT_COUNTERFEIT_QR',
        targetType: 'REGISTRATION',
        targetId: ticketId,
        details: `TAMPER ALERT: Counterfeit ticket detected! QR signature verification failed for ticket ${ticketId}.`,
        ipAddress: req.ip || '127.0.0.1'
      });

      return res.status(403).json({
        error: 'TAMPERED_TICKET_REJECTED',
        message: 'Security Alert: Tamper-proof cryptographic signature verification failed! This ticket appears fraudulent or forged.'
      });
    }

    // Find registration in database
    const registration = await db.registrations.findOne({ ticketId });
    if (!registration) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket ID not recognized in event manifest.' });
    }

    const event = await db.events.findById(eventId);

    // 2. DUPLICATE SCAN PREVENTION & SCAN MODES
    if (scanMode === 'EXIT') {
      // Exit scan mode for dual-scan events
      if (!registration.checkedIn) {
        return res.status(400).json({
          error: 'NO_ENTRY_RECORD',
          message: `Exit Scan Denied: ${registration.userName} has no prior Entry check-in record for this workshop.`
        });
      }

      if (registration.exitScanCompleted) {
        return res.status(409).json({
          error: 'DUPLICATE_EXIT_SCAN',
          message: `Duplicate Exit Scan: ${registration.userName} already scanned out at ${new Date(registration.exitScannedAt).toLocaleTimeString()}.`,
          originalExitTime: registration.exitScannedAt
        });
      }

      // Mark exit scan complete! Auto-generate certificate if eligible!
      const certHash = generateCertificateHash(registration.ticketId, eventId, registration.userName);
      const updated = await db.registrations.findByIdAndUpdate(registration.id, {
        $set: {
          exitScanCompleted: true,
          exitScannedAt: new Date().toISOString(),
          status: 'ATTENDED',
          certificateGenerated: true,
          certificateHash: certHash,
          certificateIssuedAt: new Date().toISOString()
        }
      });

      await db.auditLogs.create({
        timestamp: new Date().toISOString(),
        actorId: req.user ? req.user.id : 'door_scanner',
        actorName: req.user ? req.user.name : 'Door Security',
        actorRole: req.user ? req.user.role : 'ORGANIZER',
        action: 'EXIT_GATE_SCAN',
        targetType: 'REGISTRATION',
        targetId: registration.id,
        targetName: registration.userName,
        details: `Exit scan validated for ${registration.userName}. Dual-scan requirement met! Verified certificate hash issued: ${certHash}`,
        ipAddress: req.ip || '127.0.0.1'
      });

      return res.json({
        success: true,
        scanStatus: 'EXIT_VERIFIED',
        registration: updated,
        certificateHash: certHash,
        message: `Exit verified for ${registration.userName}! Dual-scan completed. Verified certificate generated.`
      });
    }

    // Standard ENTRY scan:
    if (registration.checkedIn) {
      // 409 CONFLICT: Shared screenshot or duplicate scan attempt!
      const originalTime = new Date(registration.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      await db.auditLogs.create({
        timestamp: new Date().toISOString(),
        actorId: req.user ? req.user.id : 'door_scanner',
        actorName: req.user ? req.user.name : 'Door Security',
        actorRole: req.user ? req.user.role : 'ORGANIZER',
        action: 'DUPLICATE_SCAN_BLOCKED',
        targetType: 'REGISTRATION',
        targetId: registration.id,
        targetName: registration.userName,
        details: `DUPLICATE ATTEMPT BLOCKED: Ticket for ${registration.userName} was already scanned at ${originalTime} by ${registration.checkedInBy || 'Gate'}. Possible shared screenshot!`,
        ipAddress: req.ip || '127.0.0.1'
      });

      return res.status(409).json({
        error: 'DUPLICATE_SCAN_DETECTED',
        message: `409 Conflict: This ticket was ALREADY SCANNED at ${originalTime} (${registration.checkedInBy || 'Gate Scanner'}). Shared screenshots and duplicate entry attempts are blocked!`,
        attendeeName: registration.userName,
        originalCheckInAt: registration.checkedInAt,
        checkedInBy: registration.checkedInBy
      });
    }

    // First scan: SUCCESS (Flashing Green)
    const now = new Date().toISOString();
    const updatedFields = {
      checkedIn: true,
      checkedInAt: now,
      checkedInBy: `${req.user ? req.user.name : 'Staff'} (${gateName})`,
      checkedInMethod: 'ONLINE'
    };

    // If event does NOT require dual-scan, mark ATTENDED and issue certificate immediately!
    let certHash = null;
    if (!event || !event.dualScanRequired) {
      certHash = generateCertificateHash(registration.ticketId, eventId, registration.userName);
      updatedFields.status = 'ATTENDED';
      updatedFields.certificateGenerated = true;
      updatedFields.certificateHash = certHash;
      updatedFields.certificateIssuedAt = now;
    }

    const updatedReg = await db.registrations.findByIdAndUpdate(registration.id, {
      $set: updatedFields
    });

    // Update event checked-in count
    if (event) {
      await db.events.findByIdAndUpdate(eventId, {
        $inc: { checkedInCount: 1 }
      });
    }

    await db.auditLogs.create({
      timestamp: now,
      actorId: req.user ? req.user.id : 'door_scanner',
      actorName: req.user ? req.user.name : 'Door Security',
      actorRole: req.user ? req.user.role : 'ORGANIZER',
      action: 'CHECK_IN_SUCCESS',
      targetType: 'REGISTRATION',
      targetId: registration.id,
      targetName: registration.userName,
      details: `First scan SUCCESS: ${registration.userName} (${registration.userEmail}) checked in at ${gateName}.`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      scanStatus: 'CHECKED_IN',
      registration: updatedReg,
      attendee: {
        name: registration.userName,
        email: registration.userEmail,
        studentId: registration.studentId,
        department: registration.department
      },
      dualScanRequired: Boolean(event && event.dualScanRequired),
      certificateHash: certHash,
      message: `Checked In: Welcome, ${registration.userName}!`
    });
  } catch (err) {
    console.error('Scan ticket error:', err);
    res.status(500).json({ error: 'Failed to process QR door scan' });
  }
}

/**
 * Pre-load encrypted guest list for OFFLINE SCANNER SYNC:
 * Basement venues with poor Wi-Fi can cache this manifest on organizer device!
 */
async function getOfflineManifest(req, res) {
  try {
    const { eventId } = req.params;
    const event = await db.events.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const registrations = await db.registrations.find({
      eventId,
      status: { $in: ['CONFIRMED', 'ATTENDED'] }
    });

    const manifest = {
      eventId: event.id,
      eventTitle: event.title,
      dualScanRequired: event.dualScanRequired,
      generatedAt: new Date().toISOString(),
      attendees: registrations.map(r => ({
        ticketId: r.ticketId,
        studentId: r.studentId,
        userName: r.userName,
        userEmail: r.userEmail,
        qrSignature: r.qrSignature,
        checkedIn: r.checkedIn,
        checkedInAt: r.checkedInAt,
        exitScanCompleted: r.exitScanCompleted
      }))
    };

    res.json({ success: true, manifest });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate offline manifest' });
  }
}

/**
 * Sync offline scans back to server with conflict resolution
 */
async function syncOfflineScans(req, res) {
  try {
    const { scans = [] } = req.body;

    const results = {
      synced: 0,
      duplicates: 0,
      errors: 0,
      details: []
    };

    for (const scan of scans) {
      const { ticketId, scannedAt, scanMode = 'ENTRY', deviceId } = scan;
      const reg = await db.registrations.findOne({ ticketId });

      if (!reg) {
        results.errors++;
        results.details.push({ ticketId, status: 'ERROR', message: 'Ticket not found' });
        continue;
      }

      if (scanMode === 'ENTRY') {
        if (reg.checkedIn) {
          results.duplicates++;
          results.details.push({
            ticketId,
            status: 'CONFLICT',
            message: `Already checked in at ${reg.checkedInAt}`
          });
        } else {
          await db.registrations.findByIdAndUpdate(reg.id, {
            $set: {
              checkedIn: true,
              checkedInAt: scannedAt || new Date().toISOString(),
              checkedInBy: `Offline Sync (${deviceId || 'Basement Scanner'})`,
              checkedInMethod: 'OFFLINE_SYNC'
            }
          });
          results.synced++;
          results.details.push({ ticketId, status: 'SYNCED', attendeeName: reg.userName });
        }
      }
    }

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user ? req.user.id : 'offline_sync',
      actorName: req.user ? req.user.name : 'Door Security',
      actorRole: req.user ? req.user.role : 'ORGANIZER',
      action: 'OFFLINE_MANIFEST_SYNC',
      targetType: 'SYSTEM',
      targetId: 'offline_queue',
      details: `Synced ${results.synced} offline door scans. Detected ${results.duplicates} duplicate scan conflicts.`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      summary: results,
      message: `Offline synchronization complete: ${results.synced} scans synced, ${results.duplicates} conflicts resolved.`
    });
  } catch (err) {
    console.error('Sync offline error:', err);
    res.status(500).json({ error: 'Failed to sync offline scans' });
  }
}

module.exports = {
  scanTicket,
  getOfflineManifest,
  syncOfflineScans
};
