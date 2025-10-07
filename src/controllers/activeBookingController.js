const { decrypt } = require('../utils/encryption')
const ActiveBooking = require('../models/ActiveBooking');
const Booking = require('../models/Booking'); // your main Booking model
const Nurse = require('../models/Nurse');
 const User = require('../models/User');
const Username = require('../models/Username');
exports.createOrUpsertActiveBooking = async ({ bookingDoc, nurseDoc }) => {
  console.log("dbacepteddddd")
  
  let userPhone = null;
  let userName = null;

  try {
    // Get user by userId - phone is stored encrypted in User collection
    const user = await User.findById(bookingDoc.userId);
  
    if (user && user.phone) {
      // Decrypt the phone number from User collection
      userPhone = decrypt(user.phone);
    }

    // Get and decrypt user name from UserName collection
    const userNameDoc = await Username.findOne({ userId: bookingDoc.userId });
    if (userNameDoc) {
      const decryptedFirstName = userNameDoc.firstName ? decrypt(userNameDoc.firstName) : '';
      const decryptedLastName = userNameDoc.lastName ? decrypt(userNameDoc.lastName) : '';
      userName = `${decryptedFirstName} ${decryptedLastName}`.trim();
     
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Continue without user data if there's an error
  }

  const payload = {
    bookingId: bookingDoc.bookingId.toString(),
    bookingRef: bookingDoc._id,
    userId: bookingDoc.userId.toString(),
    nurseId: nurseDoc._id.toString(),
    nurseName: decrypt(nurseDoc.name),
    latitude: bookingDoc.latitude,
    longitude: bookingDoc.longitude,
    amount: bookingDoc.amount,
    type:bookingDoc.type,
    status: 'accepted',
    image: nurseDoc?.image || "https://sp.yimg.com/ib/th/id/OIP.kH1nK8Nyqh0lSDp1KA0V0wHaLH?pid=Api&w=148&h=148&c=7&dpr=2&rs=1",
    currentCoords: nurseDoc.coords || null,
    locationHistory: nurseDoc.coords ? [ { ...nurseDoc.coords, timestamp: new Date() } ] : [],
    chat: [],
    metadata: {
      acceptedAt: bookingDoc.acceptedAt || new Date(),
    }
  };

  // Add decrypted userPhone and userName to payload if available
  if (userPhone) {
    payload.userPhone = userPhone;
  }
  if (userName) {
    payload.userName = userName;
  }
console.log(payload)
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
    const booking = await ActiveBooking.findOne({ bookingId });

   await Nurse.findByIdAndUpdate(
      booking.nurseId,
      { $set: { status: 'inactive', updatedAt: new Date() } }
    );
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
 const booking = await ActiveBooking.findOne({ bookingId });

  await Nurse.findByIdAndUpdate(
      booking.nurseId,
      { $set: { status: 'active', updatedAt: new Date() } }
    );
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

    // 2️⃣ Check if pagination is requested
    const hasPagination = req.query.page !== undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 3️⃣ Build query (exclude "accepted")
    let query = { status: { $ne: 'accepted' } };
    if (requesterRole === 'user') query.userId = requesterId;
    else if (requesterRole === 'nurse') query.nurseId = requesterId;

    // 4️⃣ Fetch bookings (only selected fields)
    let bookingsQuery = ActiveBooking.find(query)
      .select('bookingId userId nurseId userName nurseName image amount type status createdAt')
      .sort({ createdAt: -1 }); // newest first

    // Apply pagination only if page query parameter exists
    if (hasPagination) {
      bookingsQuery = bookingsQuery.skip(skip).limit(limit);
    }

    const bookings = await bookingsQuery.lean();

    // 5️⃣ Count total for pagination info
    const total = await ActiveBooking.countDocuments(query);

    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    // 6️⃣ Respond
    const response = {
      requester: {
        id: requesterId,
        role: requesterRole,
      },
      bookings,
    };

    // Include pagination info only if pagination was requested
    if (hasPagination) {
      response.pagination = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('getNonPendingBookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getBookingDetails = async (req, res) => {
  try {
    const { nurseId, userId, bookingId } = req.query;
    const requesterId = req.user.id;

    // Validate required parameter
    if (!bookingId) {
      return res.status(400).json({ 
        message: 'bookingId is required' 
      });
    }

    // 1️⃣ Find requester role (user or nurse)
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

    // 2️⃣ Build query with bookingId as primary filter
    let query = { bookingId: bookingId };
    
    // Add additional filters if provided
    if (nurseId) query.nurseId = nurseId;
    if (userId) query.userId = userId;

    // 3️⃣ Fetch booking details directly from ActiveBooking
    const booking = await ActiveBooking.findOne(query).lean();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // 4️⃣ Authorization check - ensure requester is involved in this booking
    const isAuthorized = 
      requesterRole === 'user' && booking.userId === requesterId ||
      requesterRole === 'nurse' && booking.nurseId === requesterId;

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to view this booking' 
      });
    }

    // 5️⃣ Fetch additional user and nurse details separately
    const [userDetails, nurseDetails] = await Promise.all([
      User.findById(booking.userId).select('name email phone profilePicture dateOfBirth').lean(),
      Nurse.findById(booking.nurseId).select('name email phone specialization experience profilePicture verificationStatus ratings').lean()
    ]);

    // 6️⃣ Transform location history to [longitude, latitude] format
    const transformLocationData = (locationArray) => {
      if (!locationArray || !Array.isArray(locationArray)) return [];
      
      return locationArray.map(location => {
        if (location && typeof location.longitude === 'number' && typeof location.latitude === 'number') {
          return [location.longitude, location.latitude];
        }
        return null;
      }).filter(coord => coord !== null); // Remove any invalid entries
    };

    const routeCoordinates = transformLocationData(booking.locationHistory);
    const currentCoordinate = booking.currentCoords ? 
      [booking.currentCoords.longitude, booking.currentCoords.latitude] : 
      null;

    // 7️⃣ Format response with separated data
    const bookingDetails = {
      bookingInfo: {
        _id: booking._id,
        bookingId: booking.bookingId,
        type: booking.type,
        status: booking.status,
        amount: booking.amount,
        userName: booking.userName,
        userPhone: booking.userPhone,
        nurseName: booking.nurseName,
        image: booking.image,
        latitude: booking.latitude,
        longitude: booking.longitude,
        currentCoords: currentCoordinate,
        locationHistory: routeCoordinates, // Transformed format
        chat: booking.chat,
        payment: booking.payment,
        metadata: booking.metadata,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      },
      userInfo: userDetails ? {
        _id: userDetails._id,
        name: userDetails.name,
        email: userDetails.email,
        phone: userDetails.phone,
        profilePicture: userDetails.profilePicture,
        dateOfBirth: userDetails.dateOfBirth
      } : {
        // Fallback to data from ActiveBooking if user not found
        _id: booking.userId,
        name: booking.userName,
        phone: booking.userPhone
      },
      nurseInfo: nurseDetails ? {
        _id: nurseDetails._id,
        name: nurseDetails.name,
        email: nurseDetails.email,
        phone: nurseDetails.phone,
        specialization: nurseDetails.specialization,
        experience: nurseDetails.experience,
        profilePicture: nurseDetails.profilePicture,
        verificationStatus: nurseDetails.verificationStatus,
        ratings: nurseDetails.ratings
      } : {
        // Fallback to data from ActiveBooking if nurse not found
        _id: booking.nurseId,
        name: booking.nurseName
      },
      requester: {
        id: requesterId,
        role: requesterRole
      }
    };

    // 8️⃣ Respond with detailed booking information
    return res.status(200).json({
      message: 'Booking details retrieved successfully',
      booking: bookingDetails
    });

  } catch (err) {
    console.error('getBookingDetails error', err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ID format' 
      });
    }
    
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
