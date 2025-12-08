const { mongoose } = require('../db/mongo');

const SettlementCacheSchema = new mongoose.Schema({
  group_id: { type: Number, unique: true, required: true },
  settlements: [
    new mongoose.Schema(
      {
        from: { type: Number, required: true },
        to: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
      { _id: false }
    ),
  ],
  generated_at: { type: Date, default: () => new Date() },
});

module.exports = mongoose.model('SettlementCache', SettlementCacheSchema);
