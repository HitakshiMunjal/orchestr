const express = require("express");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { signup, login, me } = require("../controllers/authController");
const {
  listResources,
  createResource,
  updateResource,
  listUsers,
} = require("../controllers/resourceController");
const {
  createEventBooking,
  inchargeApproveBooking,
  deanApproveBooking,
  rejectOrCancelBooking,
  completeEvent,
  listBookings,
  getBooking,
  deleteEventBooking,
} = require("../controllers/bookingController");
const {
  registerForEvent,
  cancelMyRegistration,
  listMyRegistrations,
  listEventRegistrations,
  doorCheckIn,
  downloadCertificate,
} = require("../controllers/registrationController");
const { getOperationalAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

// Auth
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", verifyToken, me);

// Resource Catalog (venues & equipment)
router.get(
  "/resources",
  verifyToken,
  requireRole("organizer", "incharge", "osa_dean", "admin"),
  listResources
);
router.post("/resources", verifyToken, requireRole("admin"), createResource);
router.patch("/resources/:id", verifyToken, requireRole("admin"), updateResource);
router.get("/users", verifyToken, requireRole("admin", "osa_dean"), listUsers);

// Bookings & Sequential Two-Stage Approval
router.get("/bookings", verifyToken, listBookings);
router.get("/bookings/:id", verifyToken, getBooking);
router.post(
  "/bookings",
  verifyToken,
  requireRole("organizer", "admin"),
  createEventBooking
);
router.patch(
  "/bookings/:id/incharge-approve",
  verifyToken,
  requireRole("incharge", "admin"),
  inchargeApproveBooking
);
router.patch(
  "/bookings/:id/dean-approve",
  verifyToken,
  requireRole("osa_dean", "admin"),
  deanApproveBooking
);
router.patch(
  "/bookings/:id/cancel-or-reject",
  verifyToken,
  requireRole("organizer", "incharge", "osa_dean", "admin"),
  rejectOrCancelBooking
);
router.patch(
  "/bookings/:id/complete",
  verifyToken,
  requireRole("organizer", "osa_dean", "admin"),
  completeEvent
);
router.delete(
  "/bookings/:id",
  verifyToken,
  requireRole("admin"),
  deleteEventBooking
);

// Student Registration, Waitlist & Verified QR Door Check-In
router.post(
  "/events/:eventId/register",
  verifyToken,
  requireRole("student"),
  registerForEvent
);
router.get(
  "/registrations/me",
  verifyToken,
  requireRole("student"),
  listMyRegistrations
);
router.patch(
  "/registrations/:id/cancel",
  verifyToken,
  requireRole("student"),
  cancelMyRegistration
);
router.get(
  "/events/:eventId/registrations",
  verifyToken,
  requireRole("organizer", "osa_dean", "admin"),
  listEventRegistrations
);
router.post(
  "/events/:eventId/checkin",
  verifyToken,
  requireRole("organizer", "osa_dean", "admin"),
  doorCheckIn
);
router.get(
  "/registrations/:id/certificate",
  verifyToken,
  requireRole("student", "osa_dean", "admin"),
  downloadCertificate
);

// Scoped Operational Analytics & Audit Trail
router.get(
  "/analytics",
  verifyToken,
  requireRole("osa_dean", "admin"),
  getOperationalAnalytics
);

module.exports = router;
