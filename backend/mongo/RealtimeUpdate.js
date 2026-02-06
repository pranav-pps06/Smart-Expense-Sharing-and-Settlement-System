const { mongoose } = require('../db/mongo');

const RealtimeUpdateSchema = new mongoose.Schema({
  group_id: { type: Number, index: true, required: true },
  event: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: () => new Date() },
});

RealtimeUpdateSchema.index({ group_id: 1, timestamp: -1 });

module.exports = mongoose.model('RealtimeUpdate', RealtimeUpdateSchema);
