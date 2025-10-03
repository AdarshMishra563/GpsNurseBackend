const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: Number,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  paid: { type: Boolean, default: false },
  method: { type: String },         // 'upi', 'card', 'wallet', etc.
  transactionId: String,
  amount: Number,
  paidAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { _id: false });

const ActiveBookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true }, // same ID used in your Booking model
  bookingRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // optional link
  userId: { type: String, required: true },
  userPhone: { type: String }, // Added user phone field
  userName: { type: String }, // Added user name field
  nurseName: String,
  image: String,
  latitude: Number,
  longitude: Number,
  nurseId: { type: String, required: true },
  status: { type: String, default: 'accepted' }, // active|accepted|in_progress|completed|cancelled
  currentCoords: LocationSchema,                 // latest location point
  locationHistory: { type: [LocationSchema], default: [] }, // append-only
  chat: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ephemeral or persisted messages
  payment: PaymentSchema,
  amount: Number,
  type:String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ActiveBookingSchema.index({ userId: 1 });
ActiveBookingSchema.index({ nurseId: 1 });
ActiveBookingSchema.index({ bookingId: 1 });

ActiveBookingSchema.pre('save', function(next){
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ActiveBooking', ActiveBookingSchema);
