const EventEmitter = require("events");
const AuditLog = require("../models/AuditLog");

class AuditEmitter extends EventEmitter {}
const auditBus = new AuditEmitter();

auditBus.on("log", async (payload) => {
  try {
    await AuditLog.create({
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      targetModel: payload.targetModel,
      targetId: payload.targetId,
      previousStatus: payload.previousStatus || null,
      newStatus: payload.newStatus || null,
      metadata: payload.metadata || {},
    });
  } catch (err) {
    console.error("Failed to write AuditLog:", err.message);
  }
});

module.exports = auditBus;
