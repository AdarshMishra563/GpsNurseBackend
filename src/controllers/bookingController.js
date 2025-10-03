const Nurse = require('../models/Nurse');
const dotenv = require('dotenv');
const Booking = require('../models/Booking');
const axios = require('axios');
const { createOrUpsertActiveBooking } = require('./activeBookingController');
dotenv.config();

async function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN;  // Set this in your .env
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lon1},${lat1};${lon2},${lat2}?access_token=${accessToken}&geometries=geojson`;

    try {
        const response = await axios.get(url);

        if (
            response.data.routes &&
            response.data.routes.length > 0
        ) {
            const route = response.data.routes[0];
            const distanceInMeters = route.distance; // Distance in meters
            const distanceInKm = distanceInMeters / 1000;
            return distanceInKm;
        } else {
            throw new Error('No route found');
        }
    } catch (error) {
        console.error('Mapbox API error:', error.message);
        throw error;
    }
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
exports.createBooking = async (req, res) => {
    try {
        const { latitude , longitude, userName,type } = req.body;
        const userId = req.user.id;
        console.log(userId);

        const nurses = await Nurse.find({
            status: 'active',
            'coords.latitude': { $exists: true },
            'coords.longitude': { $exists: true }
        });

        const nearbyNursesWithDistances = await Promise.all(
            nurses.map(async nurse => {
                const distance = await getDistanceFromLatLonInKm(
                    latitude,
                    longitude,
                    nurse.coords.latitude,
                    nurse.coords.longitude
                );
                return { nurse, distance };
            })
        );

        const nearbyNurses = nearbyNursesWithDistances
            .filter(nd => nd.distance <= 40)
            .map(nd => nd.nurse);

        const targetNurses = nearbyNurses.filter(nurse => req.activeNurses.has(nurse.id));

        const nursesToNotifyWithDistances = await Promise.all(
            targetNurses.map(async nurse => {
                const distance = await getDistanceFromLatLonInKm(
                    latitude,
                    longitude,
                    nurse.coords.latitude,
                    nurse.coords.longitude
                );

                // Calculate estimate charge
                const baseRate = 50;
                const perKmRate = 10;
                const estimateCharge = parseFloat((baseRate + distance * perKmRate).toFixed(2));

                return {
                    id: nurse.id,
                    distance: parseFloat(distance.toFixed(2)),
                    estimateCharge
                };
            })
        );

        const nursesToNotify = nursesToNotifyWithDistances.filter(n => n.distance <= 80);

        const nurseIdsToNotify = nursesToNotify.map(n => n.id);
  const bookingId = `booking_${Date.now()}`;
         const bookingData = {
            bookingId: bookingId,
            userId,
            userName,
            latitude,
            longitude,
            status: 'pending',
            type,
            timestamp: new Date()
        }
   const db= await Booking.create(bookingData);
   console.log(db);
        req.internalEvents.emit('notifyNearbyNurses', {
            nurseData: nursesToNotify,
            nurseIds: nurseIdsToNotify,
            data: bookingData,
        });
// ---- Fire Notification URL for all nurses (fire-and-forget) ----
nursesToNotify.forEach(nurse => {
  axios.post("https://gpsnursebackend.onrender.com/notification/notify", {
    id: nurse.id, // <-- must be 'id' to match backend
    role: "nurse",
    type: "newBooking",
    role:bookingData.type,
    bookingId: bookingData.bookingId || '',
    userId: bookingData.userId || '',
    userName: bookingData.userName || '',
    latitude: bookingData.latitude?.toString() || '0',
    longitude: bookingData.longitude?.toString() || '0',
    amount: nurse.estimateCharge?.toString() || '0',
    distance: nurse.distance?.toString() || '0'
  }).catch(err => {
    console.error(`Error sending notification for nurse ${nurse.id}:`, err.response?.data || err.message);
  });
});


        return res.status(201).json({
            message: 'Booking created and nearby nurses notified!',
            booking: bookingData,
            notifiedNurses: nursesToNotify
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


exports.getNearbyNurses = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        console.log(latitude, longitude);

        const nurses = await Nurse.find({
            status: 'active',
            'coords.latitude': { $exists: true },
            'coords.longitude': { $exists: true }
        });

        const baseRate = 50;
        const perKmRate = 10;

        const nearbyNursesWithDistances = await Promise.all(
            nurses.map(async nurse => {
                const distance = await getDistanceFromLatLonInKm(
                    latitude,
                    longitude,
                    nurse.coords.latitude,
                    nurse.coords.longitude
                );

                const estimateCharge = parseFloat((baseRate + distance * perKmRate).toFixed(2));

                return {
                    nurse,
                    distance: parseFloat(distance.toFixed(2)),
                    estimateCharge
                };
            })
        );

        const filteredNurses = nearbyNursesWithDistances.filter(
            nd => nd.distance <= 40 && req.activeNurses.has(nd.nurse.id)
        );

        const nearbyNurses = filteredNurses.map(nd => ({
            id: nd.nurse.id,
            coords: nd.nurse.coords,
            distance: nd.distance,
            estimateCharge: nd.estimateCharge
        }));

        // Calculate overall estimate range based on min/max of individual estimates
        const estimates = nearbyNurses.map(n => n.estimateCharge);
        const minEstimate = parseFloat(Math.min(...estimates) * 0.9).toFixed(2);
        const maxEstimate = parseFloat(Math.max(...estimates) * 1.1).toFixed(2);

        console.log(minEstimate, maxEstimate);

        return res.json({
            nearbyNurses,
            number: nearbyNurses.length,
            estimateChargeRange: [parseFloat(minEstimate), parseFloat(maxEstimate)]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.acceptBooking = async (req, res) => {
  try {
    const { bookingId,amount=250 } = req.body;
    const nurseId = req.user.id;

    // 1️⃣ Find existing booking
    const existingBooking = await Booking.findOne({ bookingId });
    if (!existingBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (existingBooking.status === 'accepted') {
      return res.status(409).json({ message: 'Booking already accepted by another nurse' });
    }

    // 2️⃣ Update booking
    existingBooking.status = 'accepted';
    existingBooking.nurseId = nurseId;
    existingBooking.acceptedAt = new Date();
    
    existingBooking.amount=amount;
    await existingBooking.save();

    // 3️⃣ Get nurse info
    const nurse = await Nurse.findById(nurseId);
    nurse.status='engaged';
    await nurse.save();

    // 4️⃣ Create or upsert ActiveBooking in DB
    const activeBooking = await createOrUpsertActiveBooking({ bookingDoc: existingBooking,
      nurseDoc: nurse})

    // 5️⃣ Update in-memory map
    req.activeBookings.set(existingBooking.bookingId.toString(), {
      userId: existingBooking.userId.toString(),
      nurseId: nurseId.toString(),
      coords: nurse.coords || null,
      chat: [],
      amount:amount,
      metadata: {
        bookingId: existingBooking.id.toString(),
        acceptedAt: existingBooking.acceptedAt,
        status: 'accepted',
      },
    });

    // 6️⃣ Emit socket event
    req.internalEvents.emit('notifyUserBookingAccepted', {
      userId: existingBooking.userId,
      bookingId: existingBooking.bookingId,
      amount:amount,
      nurseData: {
        id: nurse.id,
        name: nurse.name,
        coords: nurse.coords || null,
        image:nurse.image
      },
    });

    return res.status(200).json({
      message: 'Booking successfully accepted',
      booking: existingBooking,
      activeBooking, // optional, send back DB document
    });
  } catch (err) {
    console.error('Error in acceptBooking:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getActiveBooking = async (req, res) => {
  try {
    let { bookingId } = req.params; // could be undefined
    const requesterId = req.user.id;

    let activeBooking;

    if (bookingId && req.activeBookings.has(bookingId)) {
      // 1️⃣ Direct lookup by bookingId
      activeBooking = req.activeBookings.get(bookingId);
    } else {
      // 2️⃣ Lookup by userId or nurseId if no bookingId or not found
      for (let [key, booking] of req.activeBookings.entries()) {
        if (booking.userId === requesterId || booking.nurseId === requesterId) {
          activeBooking = booking;
          bookingId = key; // return actual bookingId
          break;
        }
      }
    }

    if (!activeBooking) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    // 3️⃣ Ensure requester is authorized
    if (requesterId !== activeBooking.userId && requesterId !== activeBooking.nurseId) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    return res.status(200).json({
      bookingId,
      ...activeBooking, // includes coords, chat, metadata
    });
  } catch (error) {
    console.error('Error in getActiveBooking:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
