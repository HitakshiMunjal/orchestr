const { Readable } = require("stream");
const crypto = require("crypto");

function generateCertificateHash(registrationId, studentId, eventId) {
  const secret = process.env.CERT_SIGNING_SECRET || "campus_engine_certificate_hmac_secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${registrationId}|${studentId}|${eventId}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

function createCertificateReadableStream({ registration, student, event, venueName }) {
  const certHash = generateCertificateHash(registration._id, student._id, event._id);

  const lines = [
    "============================================================================",
    "                   OFFICIAL CERTIFICATE OF ATTENDANCE                       ",
    "============================================================================",
    "",
    `  This certifies that : ${student.name} (${student.email})`,
    `  Department          : ${student.department}`,
    `  Attended Event      : ${event.title}`,
    `  Organized By        : ${event.clubName}`,
    `  Venue               : ${venueName}`,
    `  Event Date          : ${new Date(event.startTime).toUTCString()}`,
    `  Door Check-In Time  : ${new Date(registration.checkedInAt).toUTCString()}`,
    "",
    "----------------------------------------------------------------------------",
    `  Verification ID     : CERT-${certHash}`,
    `  Registration Ref    : ${registration._id}`,
    "============================================================================",
  ];

  return Readable.from(lines.map((line) => line + "\n"));
}

module.exports = {
  createCertificateReadableStream,
  generateCertificateHash,
};
