/**
 * Seeds demo accounts for every role + the campus resource catalog.
 *
 *   npm run seed           -> upsert users & resources (keeps existing bookings)
 *   npm run seed -- --reset -> also wipes bookings, registrations & audit logs
 *
 * All demo accounts use the password: password123
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Resource = require("./models/Resource");
const { EventBooking } = require("./models/EventBooking");
const Registration = require("./models/Registration");
const AuditLog = require("./models/AuditLog");

const DEMO_PASSWORD = "password123";
const RESET = process.argv.includes("--reset");

const USERS = [
  { key: "admin", name: "Aarav Malhotra", email: "admin@orchestr.edu", role: "admin", department: "Administration" },
  { key: "dean", name: "Dr. Meera Kapoor", email: "dean@orchestr.edu", role: "osa_dean", department: "Office of Student Affairs" },
  { key: "incharge", name: "Prof. Rohan Verma", email: "incharge@orchestr.edu", role: "incharge", department: "Estate & Venues" },
  { key: "labIncharge", name: "Dr. Sana Iqbal", email: "labincharge@orchestr.edu", role: "incharge", department: "CSE Labs" },
  { key: "organizer", name: "Kabir Mehta", email: "organizer@orchestr.edu", role: "organizer", department: "CSE" },
  { key: "organizer2", name: "Ishita Rao", email: "organizer2@orchestr.edu", role: "organizer", department: "ECE" },
  { key: "student", name: "Ananya Sharma", email: "student@orchestr.edu", role: "student", department: "CSE" },
  { key: "student2", name: "Vihaan Gupta", email: "student2@orchestr.edu", role: "student", department: "CSE" },
  { key: "student3", name: "Diya Patel", email: "student3@orchestr.edu", role: "student", department: "ME" },
];

const RESOURCES = [
  { name: "Explore Stars", type: "venue", building: "Auditorium Block", capacity: 300, incharge: "incharge" },
  { name: "Seminar Hall A", type: "venue", building: "Academic Block 1", capacity: 120, incharge: "incharge" },
  { name: "Seminar Hall B", type: "venue", building: "Academic Block 2", capacity: 80, incharge: "incharge" },
  { name: "Innovation Lab", type: "venue", building: "Tech Block", capacity: 60, incharge: "labIncharge" },
  { name: "Turing Computer Lab", type: "venue", building: "Tech Block", capacity: 45, incharge: "labIncharge" },
  { name: "4K Laser Projector", type: "equipment", building: "AV Store", capacity: 3, incharge: "incharge" },
  { name: "Wireless Mic Set", type: "equipment", building: "AV Store", capacity: 6, incharge: "incharge" },
  { name: "PA Sound System", type: "equipment", building: "AV Store", capacity: 2, incharge: "incharge" },
  { name: "DSLR Camera Kit", type: "equipment", building: "Media Room", capacity: 2, incharge: "labIncharge" },
  { name: "LED Video Wall", type: "equipment", building: "AV Store", capacity: 1, incharge: "incharge" },
];

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_engine";
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  if (RESET) {
    await EventBooking.deleteMany({});
    await Registration.deleteMany({});
    // AuditLog model blocks deletes via middleware; bypass at the driver level for a dev reset
    await AuditLog.collection.deleteMany({});
    console.log("Reset: cleared bookings, registrations and audit logs");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = {};
  for (const u of USERS) {
    users[u.key] = await User.findOneAndUpdate(
      { email: u.email },
      { $set: { name: u.name, role: u.role, department: u.department, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Upserted ${USERS.length} demo users`);

  const resources = {};
  for (const r of RESOURCES) {
    resources[r.name] = await Resource.findOneAndUpdate(
      { name: r.name },
      {
        $set: {
          type: r.type,
          building: r.building,
          capacity: r.capacity,
          inchargeId: users[r.incharge]._id,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Upserted ${RESOURCES.length} resources (venues + equipment)`);

  // One pre-approved, tiny-capacity event so the waitlist flow can be tested immediately
  if ((await EventBooking.countDocuments()) === 0) {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(17, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);

    await EventBooking.create({
      title: "Hack the Stars — Kickoff Mixer",
      clubName: "Coding Ninjas Club",
      description:
        "Pre-approved demo event with only 2 seats so you can watch the FIFO waitlist kick in with 3 students.",
      organizerId: users.organizer._id,
      venueId: resources["Seminar Hall B"]._id,
      equipmentIds: [resources["Wireless Mic Set"]._id],
      startTime: start,
      endTime: end,
      bufferMinutes: 15,
      bufferEndTime: new Date(end.getTime() + 15 * 60 * 1000),
      requestedSeats: 2,
      status: "APPROVED_OPEN",
      inchargeApproval: {
        approvedBy: users.incharge._id,
        approvedAt: new Date(),
        remarks: "Hall cleared for the evening slot",
      },
      deanApproval: {
        approvedBy: users.dean._id,
        approvedAt: new Date(),
        remarks: "Approved — registrations open",
      },
    });
    console.log("Created demo APPROVED_OPEN event (2 seats) at Seminar Hall B");
  }

  console.log("\nDemo accounts (password: password123)");
  for (const u of USERS) console.log(`  ${u.role.padEnd(10)} ${u.email}`);

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
