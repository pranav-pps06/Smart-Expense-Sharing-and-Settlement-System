const { mongoose } = require('../db/mongo');

const ActivityLogSchema = new mongoose.Schema({
  group_id: { type: Number, index: true, required: true },
  user_id: { type: Number, required: true },
  action_type: { type: String, required: true },
  expense_id: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: () => new Date() },
});

ActivityLogSchema.index({ group_id: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
