const { EventBooking } = require("../models/EventBooking");
const Registration = require("../models/Registration");
const AuditLog = require("../models/AuditLog");

// GET /api/analytics — Protected for osa_dean and admin
async function getOperationalAnalytics(req, res, next) {
  try {
    // 1. Attendance, No-Show & Waitlist Conversion Aggregation per Event
    const eventAttendanceStats = await Registration.aggregate([
      {
        $group: {
          _id: "$eventId",
          checkedInCount: {
            $sum: { $cond: [{ $eq: ["$status", "CHECKED_IN"] }, 1, 0] },
          },
          noShowCount: {
            $sum: { $cond: [{ $eq: ["$status", "NO_SHOW"] }, 1, 0] },
          },
          confirmedUnscannedCount: {
            $sum: { $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0] },
          },
          waitlistedCount: {
            $sum: { $cond: [{ $eq: ["$status", "WAITLISTED"] }, 1, 0] },
          },
          promotedFromWaitlistCount: {
            $sum: {
              $cond: [{ $ne: ["$promotedFromWaitlistAt", null] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "eventbookings",
          localField: "_id",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $project: {
          eventTitle: "$event.title",
          clubName: "$event.clubName",
          requestedSeats: "$event.requestedSeats",
          checkedInCount: 1,
          noShowCount: 1,
          confirmedUnscannedCount: 1,
          waitlistedCount: 1,
          promotedFromWaitlistCount: 1,
          attendanceRatePct: {
            $cond: [
              { $gt: [{ $add: ["$checkedInCount", "$noShowCount"] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$checkedInCount",
                          { $add: ["$checkedInCount", "$noShowCount"] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
          noShowRatePct: {
            $cond: [
              { $gt: [{ $add: ["$checkedInCount", "$noShowCount"] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$noShowCount",
                          { $add: ["$checkedInCount", "$noShowCount"] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    // 2. Venue Utilization Aggregation (Total booked hours in APPROVED_OPEN or COMPLETED)
    const venueUtilization = await EventBooking.aggregate([
      {
        $match: {
          status: { $in: ["APPROVED_OPEN", "COMPLETED"] },
        },
      },
      {
        $project: {
          venueId: 1,
          bookedHours: {
            $divide: [{ $subtract: ["$endTime", "$startTime"] }, 1000 * 60 * 60],
          },
        },
      },
      {
        $group: {
          _id: "$venueId",
          totalEvents: { $sum: 1 },
          totalBookedHours: { $sum: "$bookedHours" },
        },
      },
      {
        $lookup: {
          from: "resources",
          localField: "_id",
          foreignField: "_id",
          as: "venue",
        },
      },
      { $unwind: "$venue" },
      {
        $project: {
          venueName: "$venue.name",
          capacity: "$venue.capacity",
          totalEvents: 1,
          totalBookedHours: { $round: ["$totalBookedHours", 2] },
        },
      },
      { $sort: { totalBookedHours: -1 } },
    ]);

    const recentAuditLogs = await AuditLog.find()
      .populate("actorId", "name email role")
      .sort({ createdAt: -1 })
      .limit(25);

    return res.json({
      eventAttendanceStats,
      venueUtilization,
      recentAuditLogs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOperationalAnalytics };
