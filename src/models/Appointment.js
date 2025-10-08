// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    bookingId: {
        type: String,
        required: true,
        unique: true
    },
    nurseId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    distance: {
        type: Number,
        default: 0
    },
    token: String,
    status: {  // ✅ APPOINTMENT STATUS FIELD
        type: String,
        enum: ['pending', 'accepted', 'completed', 'cancelled', 'in_progress', 'rejected'],
        default: 'pending'
    },
    
    // Nurse data as plain fields
    nurseName: String,
    nurseEmail: String,
    nursePhoneNumber: String,
    nurseSpecialization: String,
    nurseYearsOfExperience: Number,
    nurseImage: String,
    
    // Coordinates as plain fields
    userLatitude: Number,
    userLongitude: Number,
    nurseLatitude: Number,
    nurseLongitude: Number,
    
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        changedBy: String
    }],
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

appointmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            changedBy: 'system'
        });
    }
    
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);