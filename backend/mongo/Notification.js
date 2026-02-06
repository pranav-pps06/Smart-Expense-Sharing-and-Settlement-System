const { mongoose } = require('../db/mongo');

const NotificationSchema = new mongoose.Schema({
  user_id: { type: Number, index: true, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  group_id: { type: Number },
  is_read: { type: Boolean, default: false, index: true },
  created_at: { type: Date, default: () => new Date(), index: true },
});

NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
