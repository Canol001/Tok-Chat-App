const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
}, { timestamps: true });

module.exports = mongoose.model('ChatUser', userSchema);
