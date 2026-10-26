const crypto = require('crypto');

const TICKET_SECRET = process.env.ORCHESTR_SECRET || 'orchestr-tamperproof-security-salt-2026-campus-vault';

/**
 * Generate a tamper-proof HMAC-SHA256 signature for a ticket
 */
function signTicket(payload) {
  const { ticketId, eventId, userId, timestamp } = payload;
  const serialized = `${ticketId}|${eventId}|${userId}|${timestamp}`;
  return crypto.createHmac('sha256', TICKET_SECRET).update(serialized).digest('hex');
}

/**
 * Verify a ticket's signature against its payload
 */
function verifyTicketSignature(payload, signature) {
  try {
    const expected = signTicket(payload);
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch (err) {
    return false;
  }
}

/**
 * Generate a unique public verification hash for certificates
 */
function generateCertificateHash(ticketId, eventId, studentName) {
  const content = `${ticketId}:${eventId}:${studentName}:${Date.now()}:${TICKET_SECRET}`;
  const sha = crypto.createHash('sha256').update(content).digest('hex');
  const chunk1 = sha.slice(0, 4).toUpperCase();
  const chunk2 = sha.slice(4, 8).toUpperCase();
  const chunk3 = sha.slice(8, 12).toUpperCase();
  const chunk4 = sha.slice(12, 16).toUpperCase();
  return `ORCH-${chunk1}-${chunk2}-${chunk3}-${chunk4}`;
}

/**
 * Email validation for Campus domains: (.edu or .ac.in)
 */
function isValidCampusEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.in)$/;
  return emailRegex.test(normalized);
}

/**
 * Guess campus affiliation from email
 */
function getCampusAffiliation(email) {
  try {
    const parts = email.split('@');
    if (parts.length < 2) return 'Verified Campus Member';
    const domain = parts[1].toLowerCase();
    if (domain.includes('stanford.edu')) return 'Stanford University';
    if (domain.includes('mit.edu')) return 'Massachusetts Institute of Technology';
    if (domain.includes('iitd.ac.in')) return 'IIT Delhi';
    if (domain.includes('iitb.ac.in')) return 'IIT Bombay';
    if (domain.includes('harvard.edu')) return 'Harvard University';
    if (domain.includes('berkeley.edu')) return 'UC Berkeley';
    if (domain.includes('cmu.edu')) return 'Carnegie Mellon University';
    return domain.toUpperCase();
  } catch {
    return 'Campus Member';
  }
}

module.exports = {
  signTicket,
  verifyTicketSignature,
  generateCertificateHash,
  isValidCampusEmail,
  getCampusAffiliation,
  TICKET_SECRET
};
