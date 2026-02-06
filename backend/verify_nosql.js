const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const ActivityLog = require('./mongo/ActivityLog');
const EmailOtp = require('./mongo/EmailOtp');
const SettlementCache = require('./mongo/SettlementCache');

// Colors for output
const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m"
};

async function runNoSQLDemo() {
    console.log(`${colors.cyan}--- Starting NoSQL Command Demonstration ---${colors.reset}\n`);

    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is missing in .env file");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log("Connected to MongoDB.\n");

        // 1. Find Activity Logs for Group 12
        console.log(`${colors.yellow}1. Command: db.activitylogs.find({ group_id: 12 }).sort({ timestamp: -1 }).limit(2)${colors.reset}`);
        console.log(`${colors.green}Description: Fetch latest 2 activity logs for Group 12${colors.reset}`);
        const logs = await ActivityLog.find({ group_id: 12 }).sort({ timestamp: -1 }).limit(2).lean();
        console.log("Output:", JSON.stringify(logs, null, 2));
        console.log("-".repeat(50) + "\n");

        // 2. Find Cached Settlements for Group 12
        console.log(`${colors.yellow}2. Command: db.settlementcaches.findOne({ group_id: 12 })${colors.reset}`);
        console.log(`${colors.green}Description: Retrieve cached settlement calculations for Group 12${colors.reset}`);
        const settlement = await SettlementCache.findOne({ group_id: 12 }).lean();
        console.log("Output:", JSON.stringify(settlement || "No cache found", null, 2));
        console.log("-".repeat(50) + "\n");

        // 3. Aggregate: Count Activity Types for Group 12
        console.log(`${colors.yellow}3. Command: db.activitylogs.aggregate([ { $match: { group_id: 12 } }, { $group: { _id: "$action_type", count: { $sum: 1 } } } ])${colors.reset}`);
        console.log(`${colors.green}Description: Count how many times each action type occurred in Group 12${colors.reset}`);
        const stats = await ActivityLog.aggregate([
            { $match: { group_id: 12 } },
            { $group: { _id: "$action_type", count: { $sum: 1 } } }
        ]);
        console.log("Output:", JSON.stringify(stats, null, 2));
        console.log("-".repeat(50) + "\n");

        // 4. Find Latest OTP (Any user)
        console.log(`${colors.yellow}4. Command: db.emailotps.findOne().sort({ createdAt: -1 })${colors.reset}`);
        console.log(`${colors.green}Description: Inspect the most recent OTP generated${colors.reset}`);
        const otp = await EmailOtp.findOne().sort({ createdAt: -1 }).lean();
        // Masking code for security in screenshot
        if (otp) otp.code = "****"; 
        console.log("Output:", JSON.stringify(otp || "No OTPs found", null, 2));
        console.log("-".repeat(50) + "\n");

        // 5. Cleanup/Delete Check (Simulation)
        console.log(`${colors.yellow}5. Command: db.emailotps.countDocuments({ expiresAt: { $lt: new Date() } })${colors.reset}`);
        console.log(`${colors.green}Description: Count how many expired OTPs are ready to be deleted${colors.reset}`);
        const expiredCount = await EmailOtp.countDocuments({ expiresAt: { $lt: new Date() } });
        console.log("Output:", JSON.stringify({ expired_otps_count: expiredCount }, null, 2));
        console.log("-".repeat(50) + "\n");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log(`${colors.cyan}--- Demo Completed ---${colors.reset}`);
        process.exit(0);
    }
}

runNoSQLDemo();
