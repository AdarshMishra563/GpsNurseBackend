const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const nurseSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: String,fcm:String,
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    socialIdentityType: {
        type: String,
        trim: true
    },
    socialIdentityNumber: {
        type: String,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: true,
        trim: true
    },
    licenseState: {
        type: String,
        required: true,
        trim: true
    },
    yearsOfExperience: {
        type: Number,
        required: true
    },
    specialization: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['inactive', 'active', 'pending','unVerified','engaged'],
        default: 'pending'
    },
    coords: {
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        }
    },
    socketId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Encrypt sensitive data before saving
nurseSchema.pre('save', function(next) {
    if (this.isModified('firstName')) {
        this.firstName = encrypt(this.firstName);
    }
    if (this.isModified('lastName')) {
        this.lastName = encrypt(this.lastName);
    }
    if (this.isModified('name')) {
        this.name = encrypt(this.name);
    }
    if (this.isModified('email')) {
        this.email = encrypt(this.email);
    }
    if (this.isModified('phoneNumber')) {
        this.phoneNumber = encrypt(this.phoneNumber);
    }
    if (this.isModified('password')) {
        this.password = encrypt(this.password);
    }
    if (this.isModified('socialIdentityNumber')) {
        this.socialIdentityNumber = encrypt(this.socialIdentityNumber);
    }
    if (this.isModified('licenseNumber')) {
        this.licenseNumber = encrypt(this.licenseNumber);
    }
    if (this.isModified('address')) {
        this.address = encrypt(this.address);
    }
    next();
});

// Decrypt sensitive data after finding
nurseSchema.post('find', function(docs) {
    docs.forEach(doc => {
        if (doc.firstName) doc.firstName = decrypt(doc.firstName);
        if (doc.lastName) doc.lastName = decrypt(doc.lastName);
        if (doc.name) doc.name = decrypt(doc.name);
        if (doc.email) doc.email = decrypt(doc.email);
        if (doc.phoneNumber) doc.phoneNumber = decrypt(doc.phoneNumber);
        if (doc.password) doc.password = decrypt(doc.password);
        if (doc.socialIdentityNumber) doc.socialIdentityNumber = decrypt(doc.socialIdentityNumber);
        if (doc.licenseNumber) doc.licenseNumber = decrypt(doc.licenseNumber);
        if (doc.address) doc.address = decrypt(doc.address);
    });
});

nurseSchema.post('findOne', function(doc) {
    if (doc) {
        if (doc.firstName) doc.firstName = decrypt(doc.firstName);
        if (doc.lastName) doc.lastName = decrypt(doc.lastName);
        if (doc.name) doc.name = decrypt(doc.name);
        if (doc.email) doc.email = decrypt(doc.email);
        if (doc.phoneNumber) doc.phoneNumber = decrypt(doc.phoneNumber);
        if (doc.password) doc.password = decrypt(doc.password);
        if (doc.socialIdentityNumber) doc.socialIdentityNumber = decrypt(doc.socialIdentityNumber);
        if (doc.licenseNumber) doc.licenseNumber = decrypt(doc.licenseNumber);
        if (doc.address) doc.address = decrypt(doc.address);
    }
});

nurseSchema.post('findById', function(doc) {
    if (doc) {
        if (doc.firstName) doc.firstName = decrypt(doc.firstName);
        if (doc.lastName) doc.lastName = decrypt(doc.lastName);
        if (doc.name) doc.name = decrypt(doc.name);
        if (doc.email) doc.email = decrypt(doc.email);
        if (doc.phoneNumber) doc.phoneNumber = decrypt(doc.phoneNumber);
        if (doc.password) doc.password = decrypt(doc.password);
        if (doc.socialIdentityNumber) doc.socialIdentityNumber = decrypt(doc.socialIdentityNumber);
        if (doc.licenseNumber) doc.licenseNumber = decrypt(doc.licenseNumber);
        if (doc.address) doc.address = decrypt(doc.address);
    }
});

// Also handle findOneAndUpdate operations
nurseSchema.post('findOneAndUpdate', function(doc) {
    if (doc) {
        if (doc.firstName) doc.firstName = decrypt(doc.firstName);
        if (doc.lastName) doc.lastName = decrypt(doc.lastName);
        if (doc.name) doc.name = decrypt(doc.name);
        if (doc.email) doc.email = decrypt(doc.email);
        if (doc.phoneNumber) doc.phoneNumber = decrypt(doc.phoneNumber);
        if (doc.password) doc.password = decrypt(doc.password);
        if (doc.socialIdentityNumber) doc.socialIdentityNumber = decrypt(doc.socialIdentityNumber);
        if (doc.licenseNumber) doc.licenseNumber = decrypt(doc.licenseNumber);
        if (doc.address) doc.address = decrypt(doc.address);
    }
});

module.exports = mongoose.model('Nurse', nurseSchema);