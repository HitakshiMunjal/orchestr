# Orchestr — “Every Event. Perfectly Coordinated.”

A full-stack **MERN** (MongoDB / Express / React / Node.js) campus event orchestration platform engineered for university campuses, student clubs, facility managers, and academic registrars.

Built with atomic concurrency-safe locks, cryptographic HMAC-SHA256 tamper-proof ticketing, automated waitlist promotion with time-to-live (TTL), door duplicate-scan prevention, offline basement syncing, tiered resource approvals with cleanup buffers, and verified-only PDF credential issuance.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **npm**

### 2. Running the Application
The project includes root scripts to run both the Express backend and React frontend:

```bash
# Start both server (port 5000) and client (port 5173) together:
npm run dev
```

Alternatively, you can run them individually:
```bash
# In one terminal (Backend on http://localhost:5000):
npm run server

# In another terminal (Frontend on http://localhost:5173):
npm run client
```

Or run the production build served entirely on port 5000:
```bash
npm start
# Opens http://localhost:5000
```

---

## 🏛️ System Features & Verification Guide

### 1. User Roles & Access Control
- **Campus Email Authentication:**
  - Login is strictly restricted to verified college domains ending in `.edu` or `.ac.in`. Personal emails (`@gmail.com`, `@yahoo.com`) are rejected.
  - Test by opening the **Role Switcher** (top right) and attempting to sign in with `test@gmail.com` (shows warning), then with `scholar@stanford.edu` (succeeds).
- **Role-Based Permissions & Instant Persona Switcher:**
  - Fast-switch toolbar lets you test all 4 core campus roles in 1 click:
    1. **Student:** `Aarav Sharma` (`aarav.sharma@iitd.ac.in`) — 1 strike, registered for workshops.
    2. **Club Organizer:** `Priya Patel` (`priya.patel@stanford.edu`) — Tech Club Lead.
    3. **Resource / Lab Manager:** `Dr. Vikram Rao` (`vikram.rao@iitb.ac.in`) — Labs & Equipment Custody.
    4. **Super Admin:** `Dean K. Malhotra` (`malhotra.dean@harvard.edu`) — Registrar & System Oversight.
    5. **Suspended Student:** `Zack Snyder` (`zsnyder@mit.edu`) — 3 strikes accrued, demonstrating automatic temporary registration suspension.
- **No-Show Strike System:**
  - Automated penalty counter tracks students who register for events and fail to attend.
  - 1–2 strikes: Warning banners on student dashboard.
  - 3 strikes: Automated 14-day temporary registration ban.
  - Organizers/Admins can click **"Process No-Shows"** at event completion to issue automated strikes to absent registrants.
  - Admins can inspect strike reasons, revoke strikes with administrative leniency, or issue manual disciplinary strikes from the Disciplinary Board.

---

### 2. Campus Resource & Equipment Booking
- **Room & Gear Catalog:**
  - Campus catalog featuring **Alan Turing Seminar Hall** (Cap: 60), **Alan Kay Grand Auditorium** (Cap: 250), **Ada Lovelace AI & GPU Lab** (Cap: 35), **Sony FX3 4K Cinema Rig**, **Sennheiser Wireless Mic**, and **Epson 4K Laser Projector**.
- **Time-Slot Conflict Prevention with 30-Minute Cleanup Buffer:**
  - Prevents overlapping bookings for the same room or equipment.
  - Automatically enforces a **mandatory 30-minute cleanup/turnaround buffer** between bookings.
  - Test on the **Resource Manager -> Conflict Buffer Test** tab by trying to book a room that overlaps within 30 minutes of an existing booking.
- **Tiered Approval Workflow:**
  - Basic classrooms & standard equipment (`BASIC` tier) are **auto-approved immediately**.
  - High-end research labs and expensive camera gear (`RESTRICTED` tier) are placed in `PENDING` status and routed to the Facility Manager for manual approval/rejection with formal notes.
- **Equipment Check-Out & Return Log:**
  - Tracks physical equipment custody: borrower name, expected return time, actual return time, and return condition (`Good`, `Damaged`, `Late`).
  - Allows facility managers to log inspection notes (e.g., hardware damage or late fee penalties).
- **Unclaimed Slot Auto-Release (20-Minute TTL):**
  - If an organizer does not check in to an approved room within **20 minutes of start time**, the booking is automatically cancelled and the room is released back to the catalog.
  - Includes a background cron worker (running every 30s) plus an interactive **"Sweep Unclaimed Slots"** button on the Manager dashboard.

---

### 3. Event Creation & Smart Registration
- **Room-Linked Capacity Limits:**
  - When creating an event in the Organizer Portal, selecting a venue automatically caps the maximum attendee registration limit to match the room's seating capacity.
- **Student Clash Checks:**
  - Prevents students from registering for two overlapping events running at the same time. If a conflict occurs, a schedule clash warning is displayed with conflicting event details.
- **Prerequisite Checks:**
  - Multi-part workshops (e.g., *Part 2: Deep Learning & Generative AI* requires *Part 1: Intro to Neural Networks*).
  - The system checks student records and blocks anyone who has not completed Part 1 from registering.
- **Concurrency-Safe Seat Allotment (Zero Overbooking):**
  - Atomic Mutex locking prevents race conditions, even when hundreds of students click "Register" at the exact same millisecond.
  - Test via the built-in **"Concurrency Test" modal** (fires 50 concurrent requests simultaneously) to verify that registrations never exceed venue capacity and overflow students cleanly spill over onto the waitlist.
- **Automated FIFO Waitlist Queue:**
  - When an event reaches 100% capacity, subsequent registrations are automatically queued on a first-come, first-served waitlist with position tracking (#1, #2, etc.).
- **Timed Waitlist Promotion (30-Minute TTL):**
  - When a confirmed student cancels, the system automatically promotes the #1 waitlisted student and starts a **30-minute live countdown timer**.
  - The promoted student sees a glowing **"Claim Your Seat Now"** button. If they do not claim within 30 minutes, the seat automatically rolls over to student #2.

---

### 4. Door Check-In & Security
- **Tamper-Proof QR Tickets:**
  - Every confirmed ticket includes a cryptographically signed QR code using **HMAC-SHA256** over `{ ticketId, eventId, userId, timestamp }`. Counterfeit or forged tickets are rejected (`403 Forbidden`).
- **Duplicate-Scan Prevention:**
  - Launch the **Door Check-In Scanner** from the top bar.
  - First Scan: Flashes **bright neon green** (`CHECKED_IN 200 OK`) and plays a success chime.
  - Second Scan (shared screenshot / duplicate entry): Instantly flashes **bright red** (`409 Conflict: DUPLICATE_SCAN_DETECTED`), sounds an alert buzzer, and displays the exact time and gate where the ticket was already used.
  - Built-in **Ticket Simulator Dropdown** allows instant testing without needing physical paper printouts.
- **Entry & Exit Scan Mode (Dual-Scan Requirement):**
  - Workshops can enforce dual scans. Students must scan in at the start and scan out at the conclusion to earn verified certificate eligibility (prevents students from leaving early).
- **Offline Scanner Sync (Basement Mode):**
  - Click **"Switch to Basement Mode"** in the Door Scanner.
  - Pre-loads the encrypted guest list into browser memory for venues with poor Wi-Fi.
  - Scans are validated locally and queued in an offline buffer. Reconnecting allows 1-click synchronization to the server with conflict resolution.

---

### 5. Post-Event Automation & Analytics
- **Verified-Only PDF Certificates:**
  - Background certificate generator automatically issues certificates **strictly to students marked as `CHECKED_IN`** (and dual-scan verified if required).
  - Generates crisp, landscape vector PDF certificates using `jsPDF` with metallic gold borders, recipient details, unique verification hash, and embedded verification QR code.
- **Public Certificate Verification Link:**
  - Public route `/verify/:hash` (e.g., `/verify/ORCH-A89F-3B42-7F91`).
  - Anyone (faculty, employers, recruiters) can verify certificate authenticity online without logging in.
- **Real-Time Campus Analytics:**
  - Comprehensive telemetry: Total Registrations, Actual Turnout Rate (%), No-Show Percentage (%), Waitlist Conversion Rate, and Venue Capacity Utilization.
- **Immutable System Audit Log:**
  - Permanent ledger recording every booking change, manager approval/rejection, door check-in scan, duplicate screenshot block, and strike action ("Who changed what, when, IP address, and role"). Filterable by action type and search keywords.

---

## 🛠️ Tech Stack Architecture

- **Backend:** Node.js, Express.js, MongoDB/Mongoose (with zero-configuration embedded persistence fallback to `server/data/orchestr.db.json`), JWT Authentication, Node Crypto (HMAC-SHA256).
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, jsPDF, QRCode, Canvas Confetti, Web Audio API.
- **Concurrency & Workers:** Mutex lock queues, 30-second unclaimed room auto-release worker, 15-second waitlist TTL promotion worker.
