const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
 amount:Number,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: { type: String, default: 'pending' },  // 'pending' | 'accepted'
    nurseId: { type: String, default: null }, 
    type:String,    // Nurse who accepted
    acceptedAt: { type: Date },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
