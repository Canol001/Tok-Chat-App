const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: String,
    receiver: String,
    content: String,
    imageUrl: String,
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
