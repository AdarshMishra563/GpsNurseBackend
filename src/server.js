const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const EventEmitter = require('events');
const protect=require('../src/middlewares/authMiddleware');
dotenv.config();
connectDB();
const router = express.Router();
const ActiveBooking = require('./models/ActiveBooking');
const internalEvents = new EventEmitter();
 const { updateActiveBookingLocation } = require('./controllers/activeBookingController');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const nurseRoutes = require('./routes/nurseRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const activeBookingRoutes = require('./routes/activeBookingRoutes');
const paymentRoutes = require('./routes/stripeRoutes');
const notificationRoutes = require('./routes/notificationRoute');
const assessmentRoutes = require('./routes/assesmentDataRoutes');
const appointmentRoutes = require('./routes/appointmentRoute');
const generateToken = require('./utils/generateToken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET","POST"] }
});


const activeNurses = new Map(); 
const activeUsers = new Map();  
const activeBookings = new Map(); 
const sampleNurses = [
    { id: '68c91ad4acd94eb01c3a4508', name: 'Shiwam Yadav' },
    { id: '68c91ae8acd94eb01c3a450a', name: 'Neha Tiwari' },
    { id: '68c91af3acd94eb01c3a450c', name: 'Suman Mishra' },
    { id: '68c91affacd94eb01c3a450e', name: 'Anjali Kumar' },
    { id: '68c91b09acd94eb01c3a4510', name: 'Pooja Verma' },
    { id: '68c91b12acd94eb01c3a4512', name: 'Sunita Yadav' },
    { id: '68c91b14acd94eb01c3a4514', name: 'Sunita Yadav' }
];
sampleNurses.forEach(nurse => activeNurses.set(nurse.id, null));
console.log(generateToken(sampleNurses[0].id))
// Middleware to inject maps and event emitter
app.use((req, res, next) => {
    req.activeNurses = activeNurses;
    req.activeUsers = activeUsers;
    req.internalEvents = internalEvents;
    req.activeBookings = activeBookings;
    next();
});

// Middleware to parse JSON
app.use(express.json());

// JWT protect middleware

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/nurse', nurseRoutes);
app.use('/booking', bookingRoutes);
app.use('/active',activeBookingRoutes);
app.use('/payment',paymentRoutes);
app.use('/notification',notificationRoutes);
app.use('/assessment',assessmentRoutes);
app.use('/appointment',appointmentRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
socket.on('sendChat', async ({ token, bookingId, message }) => {
  try {
    console.log("new chat");

    // 🔑 Decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.id;

    const booking = activeBookings.get(bookingId);
    if (!booking) return;

    // Determine sender role
    let senderType;
    if (senderId === booking.userId) {
      senderType = 'user';
    } else if (senderId === booking.nurseId) {
      senderType = 'nurse';
    } else {
      console.warn('Sender not part of this booking');
      return;
    }

    // Build chat message
    const chatMessage = {
      from: senderType,
      senderId,
      message,
      timestamp: Date.now(),
    };

    // Save in memory
    booking.chat.push(chatMessage);

    // Save in DB
  

    // 🔄 Send only to the opposite party
    const userSocket = activeUsers.get(booking.userId);
    const nurseSocket = activeNurses.get(booking.nurseId);

    if (senderType === "nurse" && userSocket) {
      userSocket.emit("newChatMessage", { bookingId, ...chatMessage });
    }

    if (senderType === "user" && nurseSocket) {
      nurseSocket.emit("newChatMessage", { bookingId, ...chatMessage });
    };
      await ActiveBooking.findOneAndUpdate(
      { bookingId },
      { $push: { chat: chatMessage } },
      { new: true }
    );

  } catch (err) {
    console.error("Invalid chat JWT", err);
  }
});


    // Nurse registers socket
  socket.on('registerNurse', (nurseToken) => {
  try {
    const decoded = jwt.verify(nurseToken, process.env.JWT_SECRET);
    const nurseId = decoded.id; 

    activeNurses.set(nurseId, socket);

    console.log('✅ Nurse registered:', nurseId);
    console.log('Active nurses:', Array.from(activeNurses.keys()));
  } catch (err) {
    console.error('❌ Invalid token for nurse registration', err);
    socket.emit('error', { message: 'Invalid nurse token' });
  }
});

    // User registers socket after login
    socket.on('registerUser', (userToken) => {
        try {
            const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
            const userId = decoded.id;
            activeUsers.set(userId, socket);
            console.log('Active users:', Array.from(activeUsers.keys()));
        } catch (err) {
            console.error('Invalid token for user registration', err);
        }
    });


socket.on('updateLocation', async ({ bookingId, coords }) => {
  try {  
    if (!bookingId) return console.warn('Missing bookingId in updateLocation');

    // 1️⃣ Update in-memory map if booking exists
    const booking = activeBookings.get(bookingId);
    if (booking) {
      booking.coords = coords;
      activeBookings.set(bookingId, booking);
      
    }

    // 2️⃣ Emit to user if connected
    const userSocket = activeUsers.get(booking?.userId);
    if (userSocket) {
      userSocket.emit('nurseLocationUpdate', { nurseId: booking?.nurseId, location: coords });
      
    } else {
      console.log(`User not connected, skipping socket emit`);
    }

    // 3️⃣ Always update DB
    await updateActiveBookingLocation({ bookingId, coords });
   console.log("location sent to user")

  } catch (err) {
    console.error('Error in updateLocation:', err);
  }
});



    // Disconnect handler
    socket.on('disconnect', () => {
     
        for (const [id, s] of activeUsers.entries()) {
            if (s.id === socket.id) activeUsers.delete(id);
        };
        console.log(activeBookings)
        console.log('Socket disconnected:', socket.id);
    });
});

// Event listener for booking notifications
internalEvents.on('notifyNearbyNurses', ({ nurseData, nurseIds, data }) => {
  
    nurseIds.forEach(id => {
        const socket = activeNurses.get(id);
        if (socket) {
           const nurseInfo = nurseData.find(n => n.id === id)
            socket.emit('newBooking', {
                booking: data,
                distance: nurseData.find(n => n.id === id)?.distance || null,
                userName: data.userName,
                amount:nurseInfo?.estimateCharge || null
            });
        }
    });
    console.log('Notified nurses many:', nurseIds);
});
internalEvents.on('notifyUserBookingAccepted', ({ userId, bookingId,amount, nurseData }) => {
    const userSocket = activeUsers.get(userId);
console.log(userSocket,"soclket",userId)
    if (userSocket) {
        userSocket.emit('bookingAccepted', {
            bookingId,
            amount,
            nurseId: nurseData.id,
            nurseName: nurseData.name,
            image:nurseData.image,
            nurseLocation: nurseData.coords,
          
        });

        console.log(`Sent booking acceptance notification to user ${userId}`);
    }
});

// 🔔 Internal listener for booking completion
internalEvents.on('activeBookingCompleted', ({ bookingId }) => {
  const booking = activeBookings.get(bookingId);

  if (!booking) {
    console.warn(`No active booking found in memory for bookingId ${bookingId}`);
    return;
  }

  const userSocket = activeUsers.get(booking.userId);
  const nurseSocket = activeNurses.get(booking.nurseId);

  const payload = {
    bookingId,
    status: 'completed',
    message: 'Booking has been marked as completed',
  };

  if (userSocket) {
    userSocket.emit('bookingCompleted', payload);
    console.log(`Emitted bookingCompleted to user ${booking.userId}`);
  }
  if (nurseSocket) {
    nurseSocket.emit('bookingCompleted', payload);
    console.log(`Emitted bookingCompleted to nurse ${booking.nurseId}`);
  }

  // cleanup
  activeBookings.delete(bookingId);
});


// 🔔 Internal listener for booking cancellation
internalEvents.on('activeBookingCancelled', ({ bookingId }) => {
  const booking = activeBookings.get(bookingId);

  if (!booking) {
    console.warn(`No active booking found in memory for bookingId ${bookingId}`);
    return;
  }

  const userSocket = activeUsers.get(booking.userId);
  const nurseSocket = activeNurses.get(booking.nurseId);

  const payload = {
    bookingId,
    status: 'cancelled',
    message: 'Booking has been cancelled',
  };

  if (userSocket) {
    userSocket.emit('bookingCancelled', payload);
    console.log(`Emitted bookingCancelled to user ${booking.userId}`);
  }
  if (nurseSocket) {
    nurseSocket.emit('bookingCancelled', payload);
    console.log(`Emitted bookingCancelled to nurse ${booking.nurseId}`);
  }

  // cleanup
  activeBookings.delete(bookingId);
});


console.log(generateToken("68c684fd3e4205c960f36fa3"),"generated")
console.log(generateToken("68dda56421f3477da62f1df9"),"generated2")
app.post('/test-location-update',async (req, res) => {
    try {
  const {bookingId,coords} =req.body;

    // 1️⃣ Update in-memory map
    const booking = activeBookings.get(bookingId);
    if (booking) {
      booking.coords = coords;
      activeBookings.set(bookingId, booking);
      console.log(`Updated active booking ${bookingId} with new coords in memory`);
    }else{
        
    }

    // 2️⃣ Emit to user if connected
    const userSocket = booking ? activeUsers.get(booking.userId) : null;
    if (userSocket) {
      userSocket.emit('nurseLocationUpdate', { nurseId: booking?.nurseId, location: coords });
      console.log(`Sent updated location to user ${booking?.userId}`);
    } else {
      console.log(`User not connected, skipping socket emit`);
    }

    // 3️⃣ Update DB
    await updateActiveBookingLocation({ bookingId, coords });
    console.log(`Saved location for booking ${bookingId} in DB`);

  } catch (err) {
    console.error('Error in handleLocationUpdate:', err);
  }
 res.json("success")
});

// Test sending a chat message via HTTP
app.post('/test-send-chat', protect, async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    const senderId = req.user.id;

    const booking = activeBookings.get(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    // Determine sender type
    let senderType;
    if (senderId === booking.userId) {
      senderType = 'user';
    } else if (senderId === booking.nurseId) {
      senderType = 'nurse';
    } else {
      return res.status(403).json({ message: 'Sender not part of this booking' });
    }

    const chatMessage = {
      from: senderType,  // "user" or "nurse"
      senderId,          // actual ID
      message,
      timestamp: Date.now(),
    };

    booking.chat.push(chatMessage);
  await ActiveBooking.findOneAndUpdate(
      { bookingId },
      { $push: { chat: chatMessage } },
      { new: true }
    );

    // Forward to sockets
    const userSocket = activeUsers.get(booking.userId);
    const nurseSocket = activeNurses.get(booking.nurseId);

    if (userSocket) userSocket.emit('newChatMessage', { bookingId, ...chatMessage });
    if (nurseSocket) nurseSocket.emit('newChatMessage', { bookingId, ...chatMessage });

    return res.status(200).json({
      message: 'Chat sent successfully',
      chatMessage,
    });
  } catch (err) {
    console.error('Error in /test-send-chat:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// export middleware to use in routes
module.exports = { activeBookings };