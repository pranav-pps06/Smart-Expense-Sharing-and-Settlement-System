const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');

// Import Models
const ActivityLog = require('./mongo/ActivityLog');
const SettlementCache = require('./mongo/SettlementCache');
const EmailOtp = require('./mongo/EmailOtp');

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log("Connected to MongoDB for seeding...");

        // 1. Seed Activity Logs for Group 12
        console.log("Seeding Activity Logs...");
        await ActivityLog.deleteMany({ group_id: 12 }); // Clear old
        await ActivityLog.insertMany([
            {
                group_id: 12,
                user_id: 101,
                action_type: "expense_added",
                expense_id: 5001,
                timestamp: new Date(),
                meta: { amount: 1200, description: "Lunch" }
            },
            {
                group_id: 12,
                user_id: 102,
                action_type: "settled",
                expense_id: null,
                timestamp: new Date(Date.now() - 3600000), // 1 hour ago
                meta: { amount: 600, with_user: 101 }
            },
            {
                group_id: 12,
                user_id: 103,
                action_type: "expense_added",
                expense_id: 5002,
                timestamp: new Date(Date.now() - 7200000), // 2 hours ago
                meta: { amount: 300, description: "Cab" }
            }
        ]);

        // 2. Seed Settlement Cache for Group 12
        console.log("Seeding Settlement Cache...");
        await SettlementCache.deleteMany({ group_id: 12 });
        await SettlementCache.create({
            group_id: 12,
            settlements: [
                { from: 102, to: 101, amount: 600 },
                { from: 103, to: 101, amount: 150.50 }
            ],
            generated_at: new Date()
        });

        // 3. Seed OTPs
        console.log("Seeding OTPs...");
        // Clear recent test one
        await EmailOtp.deleteMany({ email: "testuser@example.com" });
        await EmailOtp.insertMany([
            {
                email: "testuser@example.com",
                code: "123456",
                purpose: "signup",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60000) // Expires in 10 mins
            },
            {
                email: "expired@example.com",
                code: "654321",
                purpose: "reset_password",
                createdAt: new Date(Date.now() - 3600000),
                expiresAt: new Date(Date.now() - 1800000) // Expired 30 mins ago
            }
        ]);

        console.log("\nSuccess! Dummy data inserted for Group 12.");
        console.log("You can now run 'node verify_nosql.js' to see the output.");

    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seedData();
