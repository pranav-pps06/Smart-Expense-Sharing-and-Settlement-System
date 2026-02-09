/**
 * Seed MongoDB with demo data matching the SQL seed.
 * Run AFTER seed_sql_data.js so that user/group IDs exist.
 * Usage: node seed_nosql_data.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const { promisify } = require('util');
const db = require('./db/sqlconnect');

// Import Models
const ActivityLog = require('./mongo/ActivityLog');
const Notification = require('./mongo/Notification');
const RealtimeUpdate = require('./mongo/RealtimeUpdate');
const SettlementCache = require('./mongo/SettlementCache');
const EmailOtp = require('./mongo/EmailOtp');

const query = promisify(db.query).bind(db);

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log("Connected to MongoDB for seeding...");

        // Wait for MySQL
        await new Promise(r => setTimeout(r, 1500));

        // Fetch real IDs from MySQL
        const users = await query("SELECT id, name FROM users WHERE email IN ('theboss122805@gmail.com','nischalre.cs23@rvce.edu.in','niranjanarn.cs23@rvce.edu.in','nischalrellur2805@outlook.com')");
        const userMap = {};
        users.forEach(u => { userMap[u.name] = u.id; });
        const boss = userMap['Boss'], nishu = userMap['Nishu'], niranjan = userMap['Niranjan'], mani = userMap['Mani'];

        const groupRows = await query("SELECT id, name FROM groups_made WHERE parent_id IS NULL ORDER BY id");
        const grpMap = {};
        groupRows.forEach(g => { grpMap[g.name] = g.id; });

        const goaTrip = grpMap['Goa Trip'], rent = grpMap['Monthly Rent'], foodies = grpMap['Weekend Foodies'];

        console.log(`  Users: Boss=${boss}, Nishu=${nishu}, Niranjan=${niranjan}, Mani=${mani}`);
        console.log(`  Groups: Goa Trip=${goaTrip}, Monthly Rent=${rent}, Weekend Foodies=${foodies}`);

        // ─── 1. ACTIVITY LOGS ───
        console.log("\nSeeding Activity Logs...");
        await ActivityLog.deleteMany({});
        const activityLogs = [
            { group_id: goaTrip, user_id: boss,     action_type: "expense_added",  meta: { amount: 4500, description: "Flight tickets booking" },     timestamp: new Date('2025-10-05T10:30:00') },
            { group_id: goaTrip, user_id: nishu,    action_type: "expense_added",  meta: { amount: 3200, description: "Beach resort 2 nights" },       timestamp: new Date('2025-10-06T14:00:00') },
            { group_id: goaTrip, user_id: niranjan, action_type: "expense_added",  meta: { amount: 1800, description: "Dinner at Fishermans Wharf" },  timestamp: new Date('2025-10-07T20:00:00') },
            { group_id: goaTrip, user_id: mani,     action_type: "expense_added",  meta: { amount: 800,  description: "Cab to airport" },              timestamp: new Date('2025-10-08T06:00:00') },
            { group_id: goaTrip, user_id: boss,     action_type: "expense_added",  meta: { amount: 2200, description: "Water sports activities" },     timestamp: new Date('2025-10-07T11:00:00') },
            { group_id: goaTrip, user_id: nishu,    action_type: "expense_added",  meta: { amount: 600,  description: "Souvenirs and gifts" },         timestamp: new Date('2025-10-08T15:00:00') },

            { group_id: rent, user_id: nishu,    action_type: "expense_added",  meta: { amount: 15000, description: "November rent" },           timestamp: new Date('2025-11-01T09:00:00') },
            { group_id: rent, user_id: niranjan, action_type: "expense_added",  meta: { amount: 2400,  description: "Electricity bill November" }, timestamp: new Date('2025-11-10T12:00:00') },
            { group_id: rent, user_id: nishu,    action_type: "expense_added",  meta: { amount: 15000, description: "December rent" },           timestamp: new Date('2025-12-01T09:00:00') },
            { group_id: rent, user_id: nishu,    action_type: "expense_added",  meta: { amount: 15000, description: "January rent" },            timestamp: new Date('2026-01-01T09:00:00') },

            { group_id: foodies, user_id: boss,     action_type: "expense_added",  meta: { amount: 1200, description: "Lunch at Meghana Foods" },   timestamp: new Date('2025-11-15T13:00:00') },
            { group_id: foodies, user_id: niranjan, action_type: "expense_added",  meta: { amount: 850,  description: "Cafe coffee and snacks" },   timestamp: new Date('2025-11-22T16:00:00') },
            { group_id: foodies, user_id: mani,     action_type: "expense_added",  meta: { amount: 2100, description: "Birthday dinner for Nishu" }, timestamp: new Date('2025-12-05T20:00:00') },
            { group_id: foodies, user_id: boss,     action_type: "expense_added",  meta: { amount: 1800, description: "BBQ dinner at Barbeque Nation" }, timestamp: new Date('2026-01-25T19:30:00') },
            { group_id: foodies, user_id: nishu,    action_type: "expense_added",  meta: { amount: 1650, description: "Thai food at Rim Naam" },    timestamp: new Date('2026-02-08T20:00:00') },

            // Some settlement events
            { group_id: goaTrip, user_id: niranjan, action_type: "settled", meta: { amount: 1125, with_user: boss, description: "Settled Goa expenses" }, timestamp: new Date('2025-10-15T10:00:00') },
            { group_id: foodies, user_id: mani,     action_type: "settled", meta: { amount: 450,  with_user: boss, description: "Settled weekend food" }, timestamp: new Date('2025-12-20T14:00:00') },

            // Member events
            { group_id: goaTrip, user_id: boss,     action_type: "member_added", meta: { added_user: nishu,    added_name: "Nishu" },    timestamp: new Date('2025-10-04T09:00:00') },
            { group_id: goaTrip, user_id: boss,     action_type: "member_added", meta: { added_user: niranjan, added_name: "Niranjan" }, timestamp: new Date('2025-10-04T09:01:00') },
            { group_id: goaTrip, user_id: boss,     action_type: "member_added", meta: { added_user: mani,     added_name: "Mani" },     timestamp: new Date('2025-10-04T09:02:00') },
        ];
        await ActivityLog.insertMany(activityLogs);
        console.log(`  + ${activityLogs.length} activity logs`);

        // ─── 2. NOTIFICATIONS ───
        console.log("\nSeeding Notifications...");
        await Notification.deleteMany({});
        const notifications = [
            { user_id: nishu,    type: "expense_added", message: "Boss added 'Flight tickets booking' (4500) in Goa Trip",       group_id: goaTrip, created_at: new Date('2025-10-05T10:31:00') },
            { user_id: niranjan, type: "expense_added", message: "Boss added 'Flight tickets booking' (4500) in Goa Trip",       group_id: goaTrip, created_at: new Date('2025-10-05T10:31:00') },
            { user_id: mani,     type: "expense_added", message: "Boss added 'Flight tickets booking' (4500) in Goa Trip",       group_id: goaTrip, created_at: new Date('2025-10-05T10:31:00') },
            { user_id: boss,     type: "expense_added", message: "Nishu added 'Beach resort 2 nights' (3200) in Goa Trip",       group_id: goaTrip, created_at: new Date('2025-10-06T14:01:00') },
            { user_id: niranjan, type: "expense_added", message: "Nishu added 'November rent' (15000) in Monthly Rent",          group_id: rent,    created_at: new Date('2025-11-01T09:01:00') },
            { user_id: mani,     type: "expense_added", message: "Nishu added 'November rent' (15000) in Monthly Rent",          group_id: rent,    created_at: new Date('2025-11-01T09:01:00') },
            { user_id: boss,     type: "expense_added", message: "Mani added 'Birthday dinner for Nishu' (2100) in Weekend Foodies", group_id: foodies, created_at: new Date('2025-12-05T20:01:00') },
            { user_id: nishu,    type: "expense_added", message: "Mani added 'Birthday dinner for Nishu' (2100) in Weekend Foodies", group_id: foodies, created_at: new Date('2025-12-05T20:01:00') },
            { user_id: boss,     type: "settlement",    message: "Niranjan settled 1125 with you for Goa Trip",                   group_id: goaTrip, is_read: true, created_at: new Date('2025-10-15T10:01:00') },
            { user_id: boss,     type: "settlement",    message: "Mani settled 450 with you for Weekend Foodies",                 group_id: foodies, is_read: true, created_at: new Date('2025-12-20T14:01:00') },
            { user_id: nishu,    type: "expense_added", message: "Boss added 'BBQ dinner at Barbeque Nation' (1800) in Weekend Foodies", group_id: foodies, created_at: new Date('2026-01-25T19:31:00') },
            { user_id: niranjan, type: "expense_added", message: "Boss added 'BBQ dinner at Barbeque Nation' (1800) in Weekend Foodies", group_id: foodies, created_at: new Date('2026-01-25T19:31:00') },
        ];
        await Notification.insertMany(notifications);
        console.log(`  + ${notifications.length} notifications`);

        // ─── 3. REALTIME UPDATES ───
        console.log("\nSeeding Realtime Updates...");
        await RealtimeUpdate.deleteMany({});
        const realtimeUpdates = [
            { group_id: goaTrip, event: "expense_created", data: { amount: 4500, description: "Flight tickets booking", paid_by: boss },     timestamp: new Date('2025-10-05T10:30:00') },
            { group_id: goaTrip, event: "expense_created", data: { amount: 3200, description: "Beach resort 2 nights", paid_by: nishu },     timestamp: new Date('2025-10-06T14:00:00') },
            { group_id: goaTrip, event: "settlement",      data: { from: niranjan, to: boss, amount: 1125 },                                  timestamp: new Date('2025-10-15T10:00:00') },
            { group_id: rent,    event: "expense_created", data: { amount: 15000, description: "November rent", paid_by: nishu },              timestamp: new Date('2025-11-01T09:00:00') },
            { group_id: rent,    event: "expense_created", data: { amount: 15000, description: "December rent", paid_by: nishu },              timestamp: new Date('2025-12-01T09:00:00') },
            { group_id: rent,    event: "expense_created", data: { amount: 15000, description: "January rent", paid_by: nishu },               timestamp: new Date('2026-01-01T09:00:00') },
            { group_id: foodies, event: "expense_created", data: { amount: 2100, description: "Birthday dinner for Nishu", paid_by: mani },   timestamp: new Date('2025-12-05T20:00:00') },
            { group_id: foodies, event: "expense_created", data: { amount: 1800, description: "BBQ dinner at Barbeque Nation", paid_by: boss }, timestamp: new Date('2026-01-25T19:30:00') },
            { group_id: foodies, event: "settlement",      data: { from: mani, to: boss, amount: 450 },                                       timestamp: new Date('2025-12-20T14:00:00') },
        ];
        await RealtimeUpdate.insertMany(realtimeUpdates);
        console.log(`  + ${realtimeUpdates.length} realtime updates`);

        // ─── 4. SETTLEMENT CACHE (per group) ───
        console.log("\nSeeding Settlement Cache...");
        await SettlementCache.deleteMany({});
        await SettlementCache.insertMany([
            {
                group_id: goaTrip,
                settlements: [
                    { from: mani,     to: boss,  amount: 1475 },
                    { from: niranjan, to: nishu, amount: 350 },
                ],
                generated_at: new Date()
            },
            {
                group_id: rent,
                settlements: [
                    { from: niranjan, to: nishu, amount: 8133.33 },
                    { from: mani,     to: nishu, amount: 10100 },
                ],
                generated_at: new Date()
            },
            {
                group_id: foodies,
                settlements: [
                    { from: mani,     to: boss,     amount: 437.50 },
                    { from: niranjan, to: boss,     amount: 325 },
                    { from: nishu,    to: niranjan,  amount: 100 },
                ],
                generated_at: new Date()
            }
        ]);
        console.log('  + 3 settlement caches');

        // ─── 5. CLEANUP OLD TEST OTPs ───
        console.log("\nCleaning up test OTPs...");
        await EmailOtp.deleteMany({ email: { $in: ["testuser@example.com", "expired@example.com"] } });

        console.log("\n========================================");
        console.log("  NOSQL SEED COMPLETE");
        console.log("========================================");
        console.log("  Activity Logs:    " + activityLogs.length);
        console.log("  Notifications:    " + notifications.length);
        console.log("  Realtime Updates: " + realtimeUpdates.length);
        console.log("  Settlement Cache: 3 groups");
        console.log("========================================\n");

    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedData();
