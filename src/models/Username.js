const mongoose = require('mongoose');
const { encrypt } = require('../utils/encryption');

const UserNameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GpsNurseUsers', 
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    set: encrypt, 
  },
  lastName: {
    type: String,
    required: true,
    set: encrypt,
  },
}, { timestamps: true });

module.exports = mongoose.model('GpsNurseUsername', UserNameSchema);
