const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  fcm: { type: String },
  createdAt: { type: Date, default: Date.now },
});



module.exports = mongoose.model('GpsNurseUsers', userSchema);
