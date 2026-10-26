const { db } = require('../config/db');
const { generateCertificateHash, getCampusAffiliation } = require('../utils/crypto');

/**
 * Generate Certificate (VERIFIED-ONLY):
 * Background job queue / endpoint that generates certificates ONLY
 * to students marked as CHECKED_IN!
 */
async function generateCertificate(req, res) {
  try {
    const { registrationId } = req.params;
    const registration = await db.registrations.findById(registrationId);

    if (!registration) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    const event = await db.events.findById(registration.eventId);

    // VERIFIED-ONLY CHECK: Student MUST be checked in!
    if (!registration.checkedIn) {
      return res.status(403).json({
        error: 'ATTENDANCE_NOT_VERIFIED',
        message: `Certificate Denied: ${registration.userName} did not check into "${registration.eventTitle}". Certificates are strictly reserved for verified attendees.`
      });
    }

    // Dual-Scan Check: If workshop requires dual-scan, exit scan must also be completed!
    if (event && event.dualScanRequired && !registration.exitScanCompleted) {
      return res.status(403).json({
        error: 'DUAL_SCAN_INCOMPLETE',
        message: `Certificate Denied: "${event.title}" requires both Entry and Exit verification scans. Exit scan is missing.`
      });
    }

    // Generate or reuse hash
    const certHash = registration.certificateHash || generateCertificateHash(
      registration.ticketId,
      registration.eventId,
      registration.userName
    );

    const updated = await db.registrations.findByIdAndUpdate(registrationId, {
      $set: {
        status: 'ATTENDED',
        certificateGenerated: true,
        certificateHash: certHash,
        certificateIssuedAt: registration.certificateIssuedAt || new Date().toISOString()
      }
    });

    await db.auditLogs.create({
      timestamp: new Date().toISOString(),
      actorId: req.user ? req.user.id : 'system',
      actorName: req.user ? req.user.name : 'Certificate Automation Engine',
      actorRole: req.user ? req.user.role : 'SUPER_ADMIN',
      action: 'GENERATE_CERTIFICATE',
      targetType: 'REGISTRATION',
      targetId: registration.id,
      targetName: registration.userName,
      details: `Issued verified digital certificate to ${registration.userName} for "${registration.eventTitle}". Public verification token: ${certHash}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      certificateHash: certHash,
      registration: updated,
      verificationUrl: `/verify/${certHash}`,
      message: `Verified certificate generated successfully for ${registration.userName}!`
    });
  } catch (err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ error: 'Failed to generate verified certificate' });
  }
}

/**
 * Public Certificate Verification (PUBLIC ROUTE - NO AUTH REQUIRED)
 * Anyone, employers, or faculty can verify authenticity of certificate hash online.
 */
async function verifyCertificate(req, res) {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({ error: 'Certificate hash is required' });
    }

    const registration = await db.registrations.findOne({
      certificateHash: hash.toUpperCase()
    });

    if (!registration) {
      return res.status(404).json({
        verified: false,
        error: 'CERTIFICATE_NOT_FOUND',
        message: 'No verified record exists for this credential hash. The certificate may be invalid or forged.'
      });
    }

    const event = await db.events.findById(registration.eventId);
    const affiliation = getCampusAffiliation(registration.userEmail);

    res.json({
      verified: true,
      certificateHash: registration.certificateHash,
      recipientName: registration.userName,
      recipientEmail: registration.userEmail,
      affiliation,
      studentId: registration.studentId,
      eventTitle: registration.eventTitle,
      eventCategory: event ? event.category : 'CAMPUS_WORKSHOP',
      organizerName: event ? event.organizerName : 'Campus Club Lead',
      clubName: event ? event.clubName : 'University Society',
      issuedAt: registration.certificateIssuedAt || registration.checkedInAt,
      checkedInAt: registration.checkedInAt,
      exitScannedAt: registration.exitScannedAt,
      dualScanVerified: Boolean(registration.exitScanCompleted),
      securitySeal: 'VERIFIED_BY_ORCHESTR_CRYPTOGRAPHIC_REGISTRY'
    });
  } catch (err) {
    res.status(500).json({ error: 'Certificate verification lookup failed' });
  }
}

module.exports = {
  generateCertificate,
  verifyCertificate
};
