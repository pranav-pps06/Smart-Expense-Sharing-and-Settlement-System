const mongoose = require('mongoose');

const receiptCacheSchema = new mongoose.Schema({
  // Hash of the image file for deduplication
  image_hash: { type: String, required: true, unique: true, index: true },
  // Extracted data
  data: {
    amount: { type: Number },
    description: { type: String },
    date: { type: String },
    merchant: { type: String },
    items: [{ type: String }]
  },
  // User who uploaded
  user_id: { type: Number },
  // Timestamps
  created_at: { type: Date, default: Date.now },
  // How many times this receipt was re-uploaded
  hit_count: { type: Number, default: 1 }
}, {
  collection: 'receipt_cache'
});

// TTL index - cache expires after 30 days
receiptCacheSchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('ReceiptCache', receiptCacheSchema);
