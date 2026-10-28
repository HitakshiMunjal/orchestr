const Resource = require("../models/Resource");
const User = require("../models/User");
const auditBus = require("../services/auditBus");
const { httpError } = require("../utils/httpError");

const EDITABLE_FIELDS = ["name", "building", "capacity", "inchargeId", "imageUrl", "isActive"];

// GET /api/resources?type=venue|equipment
async function listResources(req, res, next) {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    // Only admins see deactivated resources
    if (req.user.role !== "admin") filter.isActive = true;

    const resources = await Resource.find(filter)
      .populate("inchargeId", "name email")
      .sort({ type: -1, capacity: -1, name: 1 });

    return res.json({ resources });
  } catch (err) {
    next(err);
  }
}

async function assertValidIncharge(inchargeId) {
  const incharge = await User.findById(inchargeId);
  if (!incharge || !["incharge", "admin"].includes(incharge.role)) {
    throw httpError(400, "inchargeId must reference a user with the In-Charge role");
  }
}

// POST /api/resources (admin)
async function createResource(req, res, next) {
  try {
    const { name, type, building, capacity, inchargeId, imageUrl } = req.body;
    if (!name || !type || !capacity || !inchargeId) {
      throw httpError(400, "name, type, capacity and inchargeId are required");
    }
    await assertValidIncharge(inchargeId);

    const resource = await Resource.create({
      name,
      type,
      building,
      capacity: Number(capacity),
      inchargeId,
      imageUrl,
    });

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "RESOURCE_CREATED",
      targetModel: "Resource",
      targetId: resource._id,
      metadata: { name, type, capacity: resource.capacity },
    });

    await resource.populate("inchargeId", "name email");
    return res.status(201).json({ resource });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/resources/:id (admin)
async function updateResource(req, res, next) {
  try {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.inchargeId) await assertValidIncharge(updates.inchargeId);

    const resource = await Resource.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("inchargeId", "name email");

    if (!resource) throw httpError(404, "Resource not found");

    auditBus.emit("log", {
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "RESOURCE_UPDATED",
      targetModel: "Resource",
      targetId: resource._id,
      metadata: updates,
    });

    return res.json({ resource });
  } catch (err) {
    next(err);
  }
}

// GET /api/users?role=incharge (admin / osa_dean)
async function listUsers(req, res, next) {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select("-passwordHash").sort({ name: 1 });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

module.exports = { listResources, createResource, updateResource, listUsers };
