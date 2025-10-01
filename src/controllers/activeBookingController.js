const ActiveBooking = require('../models/ActiveBooking');
const Booking = require('../models/Booking'); // your main Booking model
const Nurse = require('../models/Nurse');
 const User = require('../models/User');
exports.createOrUpsertActiveBooking = async ({ bookingDoc, nurseDoc }) => {
  console.log("dbacepteddddd")
  const payload = {
    bookingId: bookingDoc.bookingId.toString(),
    bookingRef: bookingDoc._id,
    userId: bookingDoc.userId.toString(),
    nurseId: nurseDoc._id.toString(),
    nurseName:nurseDoc.name,
    latitude:bookingDoc.latitude,
    longitude:bookingDoc.longitude,
    amount:bookingDoc.amount,
    status: 'accepted',
    image:nurseDoc?.image || "https://sp.yimg.com/ib/th/id/OIP.kH1nK8Nyqh0lSDp1KA0V0wHaLH?pid=Api&w=148&h=148&c=7&dpr=2&rs=1",
    currentCoords: nurseDoc.coords || null,
    locationHistory: nurseDoc.coords ? [ { ...nurseDoc.coords, timestamp: new Date() } ] : [],
    chat: [],
    metadata: {
      acceptedAt: bookingDoc.acceptedAt || new Date(),
    }
  };

  // upsert into DB
  const active = await ActiveBooking.findOneAndUpdate(
    { bookingId: payload.bookingId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return active;
};

exports.getActiveBookingByUserOrNurse = async (req, res) => {
  try {
    const requesterId = req.user.id;
console.log(req.user.id)
    // 1️⃣ Find role (user or nurse)
    let requesterRole;
    let requesterDoc = await User.findById(requesterId).lean();
    if (requesterDoc) {
      requesterRole = 'user';
    } else {
      requesterDoc = await Nurse.findById(requesterId).lean();
      if (requesterDoc) requesterRole = 'nurse';
    }

    if (!requesterRole) {
      return res.status(403).json({ message: 'Requester not found' });
    }
 

    // 2️⃣ Build query for latest active booking
    let query = { status: { $nin: ['completed', 'cancelled'] } };
    if (requesterRole === 'user') query.userId = requesterId;
    else if (requesterRole === 'nurse') query.nurseId = requesterId;

    // 3️⃣ Fetch latest active booking (by most recent acceptedAt or createdAt)
    const active = await ActiveBooking.findOne(query)
      .sort({ acceptedAt: -1, createdAt: -1 })
      .lean();

    if (!active) {
      return res.status(404).json({ message: 'No active booking' });
    }

    // 4️⃣ Inject into in-memory activeBookings map
    req.activeBookings.set(active.bookingId.toString(), {
      userId: active.userId.toString(),
      nurseId: active.nurseId ? active.nurseId.toString() : null,
      coords: active.nurseCoords || null,
      amount:active.amount, // use nurse coords if available
      chat: active.chat || [],            // keep chat if you already store it
      metadata: {
        bookingId: active.bookingId.toString(),
        acceptedAt: active.acceptedAt || active.createdAt,
        status: active.status,
      },
    });

    // 5️⃣ Respond
    return res.status(200).json({
      requester: {
        id: requesterId,
        role: requesterRole,
      },
      active,
    });
  } catch (err) {
    console.error('getActiveBooking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};





exports.updatePayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paid, method, transactionId, amount, metadata } = req.body;

    const updated = await ActiveBooking.findOneAndUpdate(
      { bookingId },
      {
        $set: {
          'payment.paid': !!paid,
          'payment.method': method,
          'payment.transactionId': transactionId,
          'payment.amount': amount,
          'payment.paidAt': paid ? new Date() : null,
          'payment.metadata': metadata || {}
        }
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Active booking not found' });

    return res.status(200).json({ message: 'Payment updated', payment: updated.payment });
  } catch (err) {
    console.error('updatePayment error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    // mark DB booking complete and remove activebooking or set status completed
    const updated = await ActiveBooking.findOneAndUpdate(
      { bookingId },
      { $set: { status: 'completed', updatedAt: new Date() } },
      { new: true }
    );

    // optionally delete after some delay / archive
    // await ActiveBooking.deleteOne({ bookingId });

    // remove from in-memory map
   

    // emit event
    if (req.internalEvents) req.internalEvents.emit('activeBookingCompleted', { bookingId });

    return res.status(200).json({ message: 'Booking completed', active: updated });
  } catch (err) {
    console.error('completeBooking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateActiveBookingLocation=async ({ bookingId, nurseId, coords })=> {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    throw new Error('Coordinates with latitude and longitude are required');
  }

  if (!bookingId && !nurseId) {
    throw new Error('bookingId or nurseId must be provided');
  }
  console.log(bookingId)

  const point = { ...coords, timestamp: new Date() };

  const query = bookingId
    ? { bookingId }
    : { nurseId, status: { $nin: ['completed', 'cancelled'] } };

  const updated = await ActiveBooking.findOneAndUpdate(
    query,
    {
      $set: { currentCoords: point },
      $push: { locationHistory: point }
    },
    { new: true }
  );

  if (!updated) {
    throw new Error('Active booking not found');
  }

  return updated;
}


exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // mark DB booking cancelled
    const updated = await ActiveBooking.findOneAndUpdate(
      { bookingId },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    // remove from in-memory map
   

    // emit event for sockets/other services
    if (req.internalEvents) {
      req.internalEvents.emit('activeBookingCancelled', { bookingId });
    }

    return res.status(200).json({ message: 'Booking cancelled', active: updated });
  } catch (err) {
    console.error('cancelBooking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getNonPendingBookings = async (req, res) => {
  try {
    const requesterId = req.user.id;

    // 1️⃣ Find role (user or nurse)
    let requesterRole;
    let requesterDoc = await User.findById(requesterId).lean();
    if (requesterDoc) {
      requesterRole = 'user';
    } else {
      requesterDoc = await Nurse.findById(requesterId).lean();
      if (requesterDoc) requesterRole = 'nurse';
    }

    if (!requesterRole) {
      return res.status(403).json({ message: 'Requester not found' });
    }

    // 2️⃣ Build query for all non-pending bookings
    let query = { status: { $ne: 'pending' } }; // all except pending
    if (requesterRole === 'user') query.userId = requesterId;
    else if (requesterRole === 'nurse') query.nurseId = requesterId;

    // 3️⃣ Fetch all sorted by latest first
    const bookings = await ActiveBooking.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    // 4️⃣ Respond
    return res.status(200).json({
      requester: {
        id: requesterId,
        role: requesterRole,
      },
      bookings,
    });
  } catch (err) {
    console.error('getNonPendingBookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
