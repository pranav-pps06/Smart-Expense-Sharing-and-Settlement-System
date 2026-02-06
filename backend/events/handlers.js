const bus = require('./bus');
const { connectMongo } = require('../db/mongo');
const ActivityLog = require('../mongo/ActivityLog');
const Notification = require('../mongo/Notification');
const RealtimeUpdate = require('../mongo/RealtimeUpdate');
const { computeAndCacheSettlements } = require('../services/settlements');

// Helper to safely perform Mongo writes
async function safeWrite(fn) {
  try {
    await connectMongo();
    await fn();
  } catch (e) {
    console.error('Mongo handler error:', e.message);
  }
}

bus.on('group:created', (evt) => {
  safeWrite(async () => {
    await ActivityLog.create({
      group_id: evt.groupId,
      user_id: evt.createdBy,
      action_type: 'GROUP_CREATED',
      meta: { name: evt.name, members: evt.memberIds },
    });
    const notifyUsers = evt.memberIds.filter((id) => id !== evt.createdBy);
    if (notifyUsers.length) {
      await Notification.insertMany(
        notifyUsers.map((uid) => ({
          user_id: uid,
          type: 'GROUP_CREATED',
          message: `You were added to ${evt.name} group`,
          group_id: evt.groupId,
        }))
      );
    }
    await RealtimeUpdate.create({
      group_id: evt.groupId,
      event: 'GROUP_CREATED',
      data: { name: evt.name, created_by: evt.createdBy },
    });
    const io = require('../app').get('io');
    if (io) io.emit('GROUP_CREATED', evt); // broadcast so newly added members receive it
  });
});

bus.on('expense:added', (evt) => {
  safeWrite(async () => {
    await ActivityLog.create({
      group_id: evt.groupId,
      user_id: evt.payerId,
      action_type: 'EXPENSE_ADDED',
      expense_id: evt.expenseId,
      meta: { amount: evt.amount, description: evt.description, participants: evt.participantIds || [] },
    });
    const notifyUsers = (evt.participantIds || []).filter((id) => id !== evt.payerId);
    if (notifyUsers.length) {
      await Notification.insertMany(
        notifyUsers.map((uid) => ({
          user_id: uid,
          type: 'EXPENSE_ADDED',
          message: `An expense ₹${evt.amount} was added`,
          group_id: evt.groupId,
        }))
      );
    }
    await RealtimeUpdate.create({
      group_id: evt.groupId,
      event: 'EXPENSE_ADDED',
      data: {
        expense_id: evt.expenseId,
        amount: evt.amount,
        paid_by: evt.payerId,
        description: evt.description,
      },
    });
    const io = require('../app').get('io');
    if (io) io.to(`group_${evt.groupId}`).emit('EXPENSE_ADDED', evt);

    // Recompute settlements cache for the group (best-effort)
    try {
      await computeAndCacheSettlements(evt.groupId);
    } catch (e) {
      console.error('Settlement recompute failed:', e.message);
    }
  });
});

module.exports = null;
