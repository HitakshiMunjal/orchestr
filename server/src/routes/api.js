const express = require('express');
const router = express.Router();

const { authenticate, requireAuth, requireRole, requireUnblockedStudent } = require('../middleware/auth');
const authController = require('../controllers/authController');
const resourceController = require('../controllers/resourceController');
const eventController = require('../controllers/eventController');
const registrationController = require('../controllers/registrationController');
const checkinController = require('../controllers/checkinController');
const certificateController = require('../controllers/certificateController');
const analyticsController = require('../controllers/analyticsController');
const auditController = require('../controllers/auditController');

// All API requests pass through the authenticator (reads JWT or demo x-user-id header)
router.use(authenticate);

/* ---------------- AUTHENTICATION & DEMO ROLES ---------------- */
router.post('/auth/login', authController.login);
router.get('/auth/me', requireAuth, authController.getMe);
router.get('/auth/users', authController.getDemoUsers);

/* ---------------- CAMPUS RESOURCES & BOOKINGS ---------------- */
router.get('/resources', resourceController.getResources);
router.post('/resources', requireAuth, requireRole(['RESOURCE_MANAGER', 'SUPER_ADMIN']), resourceController.createResource);

router.get('/bookings', resourceController.getBookings);
router.post('/bookings', requireAuth, resourceController.createBooking); // Has 30-min cleanup conflict check & tiered approval
router.put('/bookings/:id/approve', requireAuth, requireRole(['RESOURCE_MANAGER', 'SUPER_ADMIN']), resourceController.approveBooking);
router.put('/bookings/:id/reject', requireAuth, requireRole(['RESOURCE_MANAGER', 'SUPER_ADMIN']), resourceController.rejectBooking);
router.post('/bookings/:id/checkin', requireAuth, resourceController.checkinBooking); // Prevents 20-min auto-release
router.post('/bookings/sweep-unclaimed', requireAuth, resourceController.triggerSweep); // Manual trigger for testing auto-release

/* ---------------- EQUIPMENT CHECKOUT LOGS ---------------- */
router.get('/checkout-logs', resourceController.getCheckoutLogs);
router.post('/checkout-logs', requireAuth, requireRole(['RESOURCE_MANAGER', 'SUPER_ADMIN']), resourceController.checkoutGear);
router.put('/checkout-logs/:id/return', requireAuth, requireRole(['RESOURCE_MANAGER', 'SUPER_ADMIN']), resourceController.returnGear);

/* ---------------- EVENTS ---------------- */
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);
router.post('/events', requireAuth, requireRole(['ORGANIZER', 'SUPER_ADMIN']), eventController.createEvent); // Room-linked capacity
router.post('/events/:id/mark-noshows', requireAuth, requireRole(['ORGANIZER', 'SUPER_ADMIN']), eventController.markNoShows);
router.post('/events/:id/stress-test', requireAuth, registrationController.stressTest); // 50 concurrent requests simulator

/* ---------------- REGISTRATIONS, CONCURRENCY & WAITLIST ---------------- */
router.get('/registrations/my', requireAuth, registrationController.getMyRegistrations);
router.post('/events/:id/register', requireAuth, requireUnblockedStudent, registrationController.registerForEvent);
router.post('/registrations/:id/cancel', requireAuth, registrationController.cancelRegistration); // Triggers Timed Waitlist Promotion (TTL)
router.post('/registrations/:id/claim-waitlist', requireAuth, registrationController.claimWaitlistSeat);

/* ---------------- DOOR CHECK-IN & SECURITY ---------------- */
router.post('/checkin/scan', requireAuth, checkinController.scanTicket); // HMAC verify, duplicate prevent, dual scan
router.get('/checkin/manifest/:eventId', requireAuth, checkinController.getOfflineManifest);
router.post('/checkin/sync-offline', requireAuth, checkinController.syncOfflineScans);

/* ---------------- CERTIFICATES & VERIFICATION ---------------- */
router.post('/certificates/generate/:registrationId', requireAuth, certificateController.generateCertificate);
router.get('/certificates/verify/:hash', certificateController.verifyCertificate); // PUBLIC VERIFIER ROUTE

/* ---------------- ANALYTICS & AUDIT LOGS ---------------- */
router.get('/analytics', analyticsController.getAnalytics);
router.get('/audit-logs', requireAuth, requireRole(['SUPER_ADMIN']), auditController.getAuditLogs);
router.post('/strikes/revoke', requireAuth, requireRole(['SUPER_ADMIN']), auditController.revokeStrike);
router.post('/strikes/issue', requireAuth, requireRole(['SUPER_ADMIN']), auditController.issueStrike);
router.post('/attendance/override', requireAuth, requireRole(['ORGANIZER', 'RESOURCE_MANAGER', 'SUPER_ADMIN']), auditController.overrideAttendance);

module.exports = router;
