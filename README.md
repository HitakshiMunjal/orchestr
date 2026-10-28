# Campus Engine — Unified Venue-Lock & Event Operations Platform

A full-stack MERN backend & operations platform that connects **official campus venue & equipment reservations** (with two-stage In-Charge & OSA Dean locks) directly to **capacity-capped event registrations, FIFO waitlists, duplicate-proof QR door check-ins, streamed certificates, and operational analytics**.

---

## 🔒 Core 6-Step Workflow & Backend Rules

1. **Resource Catalog (`Admin`):**
   - Manage campus venues (e.g., *Explore Stars*, *Seminar Halls*, *Labs*) with physical `capacity` and assigned `inchargeId`, plus shared equipment (*Projectors*, *Mics*, *Cameras*).
2. **Provisional Booking & Conflict Prevention (`Club Organizer`):**
   - Organizer submits an event request with `requestedSeats <= venue.capacity` and time window `[startTime, endTime]`.
   - Backend automatically adds a **15-minute cleanup buffer** (`bufferEndTime = endTime + 15m`) and checks for overlapping active holds (`PENDING_INCHARGE`, `PENDING_OSA_DEAN`, `APPROVED_OPEN`).
   - Submitting a valid request places an immediate **provisional hold (`PENDING_INCHARGE`)** so no second club can double-book the slot while approval is pending.
3. **Sequential Two-Stage Approval (`In-Charge` → `OSA Dean`):**
   - **Stage 1:** Assigned Venue In-Charge approves (`PENDING_INCHARGE` → `PENDING_OSA_DEAN`).
   - **Stage 2:** OSA Dean approves (`PENDING_OSA_DEAN` → `APPROVED_OPEN`), officially locking the room and opening student registrations.
   - If rejected or cancelled at any stage, the provisional hold is released immediately.
   - **Cascading Registration Cancellation:** If an organizer or admin cancels an event that was already in `APPROVED_OPEN`, all active student registrations (`CONFIRMED` or `WAITLISTED`) are automatically transitioned to `CANCELLED`, their QR tokens are revoked, and `cancelledAt` timestamps are recorded.
4. **Concurrency-Safe Registration & FIFO Waitlist (`Student`):**
   - Unique compound index `{ eventId: 1, studentId: 1 }` prevents duplicate registrations.
   - Uses an atomic conditional update (`$expr: { $lt: ["$confirmedCount", "$requestedSeats"] }`) inside a MongoDB transaction so simultaneous requests never overbook the last seat.
   - Overflow students enter a `WAITLISTED` queue and are automatically promoted in **FIFO order** (`sort: { createdAt: 1 }`) when a confirmed student cancels.
5. **Verified Door QR Check-In (`Club Organizer`):**
   - Validates that the scanning user is the authorized organizer for `:eventId`, that the `qrToken` belongs to `:eventId`, and blocks screenshot sharing (`409 Conflict: Duplicate Scan`) on repeat scans.
6. **Streamed Certificates & Scoped Analytics (`Student` & `Admin/OSA Dean`):**
   - `GET /api/registrations/:id/certificate` independently verifies `status === "CHECKED_IN"` in MongoDB and streams the certificate using **Node.js `Readable` Streams**.
   - `GET /api/analytics` (protected for `osa_dean` / `admin`) runs **MongoDB Aggregation Pipelines** for Turnout Rate, No-Show Rate, Waitlist Conversion, and Venue Utilization.

---

## 👥 4-Member Team Split

| Member | Module Ownership | Key Files |
| :--- | :--- | :--- |
| **Member 1** | Auth, RBAC & Resource Catalog | `models/User.js`, `models/Resource.js`, `controllers/resourceController.js` |
| **Member 2** | Conflict Engine, 2-Stage Approvals & Audit Bus | `models/EventBooking.js`, `models/AuditLog.js`, `services/conflictService.js`, `services/auditBus.js`, `controllers/bookingController.js` |
| **Member 3** | Atomic Registration & FIFO Waitlist Engine | `models/Registration.js`, `services/registrationService.js`, `controllers/registrationController.js` |
| **Member 4** | QR Check-In, Certificate Stream & Analytics | `services/certificateStream.js`, `controllers/analyticsController.js` |

---

## 🚀 Quick Start

### Ports
- **Backend API Server**: `http://localhost:5050`
- **Frontend Web Client**: `http://localhost:5174`

### 1. Backend (`server/`)
```bash
cd server
cp .env.example .env
npm install
npm run seed       # Seeds demo accounts for all roles + Explore Stars venue
npm run dev        # Starts API server on http://localhost:5050
```

### 2. Frontend (`client/`)
```bash
cd client
npm install
npm run dev        # Starts Vite app on http://localhost:5174
```

---

## 🔑 Demo Accounts (Password for all: `password123`)

| Role | Email | Permissions / Features |
| :--- | :--- | :--- |
| **Admin** | `admin@orchestr.edu` | Full catalog CRUD, assign in-charges, bypass approval stages, view analytics |
| **OSA Dean** | `dean@orchestr.edu` | Stage 2 venue-lock approval (`PENDING_OSA_DEAN` → `APPROVED_OPEN`), view campus analytics |
| **In-Charge** | `incharge@orchestr.edu` | Stage 1 approval (`PENDING_INCHARGE` → `PENDING_OSA_DEAN`) for *Explore Stars* & *Seminar Halls* |
| **Organizer** | `organizer@orchestr.edu` | Book venues (+15m cleanup buffer), launch Door QR Scanner, complete events (flag no-shows) |
| **Student** | `student@orchestr.edu` | Browse open events, atomic seat registration, FIFO waitlist, QR pass & certificate streaming |

---

## 📡 Complete REST API Reference

### Authentication & Users
- `POST /api/auth/signup` — Student & Organizer self-registration
- `POST /api/auth/login` — Returns JWT token and role
- `GET /api/auth/me` — Authenticated profile lookup
- `GET /api/users?role=incharge` — In-Charge faculty directory (Admin / OSA Dean)

### Resource Catalog
- `GET /api/resources?type=venue|equipment` — List catalog items (Explore Stars, Projectors, etc.)
- `POST /api/resources` — Create new venue or gear (Admin only)
- `PATCH /api/resources/:id` — Update venue capacity, in-charge, or active status (Admin only)

### Bookings & 2-Stage Approvals
- `GET /api/bookings?status=...&scope=mine|incharge` — Filtered bookings with seat metrics
- `GET /api/bookings/:id` — Detailed booking record
- `POST /api/bookings` — Provisional hold with +15m cleanup buffer & conflict engine
- `PATCH /api/bookings/:id/incharge-approve` — Stage 1 In-Charge approval
- `PATCH /api/bookings/:id/dean-approve` — Stage 2 OSA Dean final venue-lock
- `PATCH /api/bookings/:id/cancel-or-reject` — Releases room & gear holds immediately
- `PATCH /api/bookings/:id/complete` — Closes event, marks unscanned seats as `NO_SHOW`

### Registration, Waitlist & Check-In
- `POST /api/events/:eventId/register` — Concurrency-safe seat allotment or FIFO waitlist placement
- `GET /api/registrations/me` — Student ticket passes & live FIFO queue positions
- `PATCH /api/registrations/:id/cancel` — Cancels registration & auto-promotes waitlist in FIFO order
- `GET /api/events/:eventId/registrations` — Organizer attendee roster
- `POST /api/events/:eventId/checkin` — Door QR check-in (blocks duplicate screenshot scans)
- `GET /api/registrations/:id/certificate` — Streams HMAC-signed attendance certificate

### Operational Analytics
- `GET /api/analytics` — MongoDB aggregation pipelines for Turnout, No-Show, Waitlist conversion & immutable Audit Log

