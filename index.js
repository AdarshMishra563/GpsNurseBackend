const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Sample data
const nurses = [
  {
    id: 1,
    name: 'Nurse Jane',
    imageUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    rating: 4.8,
    specialty: 'Pediatric Care',
    coords: { latitude: 27.78825, longitude: 82.4324 },
    available: true,
    socketId: null
  },
  {
    id: 2,
    name: 'Nurse John',
    imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
    rating: 4.6,
    specialty: 'Elderly Care',
    coords: { latitude: 25.78225, longitude: 82.4224 },
    available: true,
    socketId: null
  },
  {
    id: 3,
    name: 'Nurse Sarah',
    imageUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
    rating: 4.9,
    specialty: 'Post-Op Care',
    coords: { latitude: 25.79225, longitude: 82.4424 },
    available: true,
    socketId: null
  }
];

const users = [
  {
    id: 1,
    email: 'user@example.com',
    password: '$2a$10$X8W.9JQZz7z6z6z6z6z6zO', // hashed "password"
    name: 'John Doe',
    phone: '+1234567890'
  }
];

const bookings = [];

// JWT Secret
const JWT_SECRET = 'mlphpxjsbsnsmvlfcnzhkgx';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password (in real app, use bcrypt.compare)
    if (password !== 'password') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get nearby nurses
app.post('/nearby-nurses', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // In a real app, you would calculate distance and filter nurses
    // For demo, we'll just return all nurses with a simulated "found" status
    
    const randomFound = true; // 70% chance of finding nurses
    
    if (randomFound) {
      res.json({
        found: true,
        nurses: nurses.map(nurse => ({
          id: nurse.id,
          name: nurse.name,
          imageUrl: nurse.imageUrl,
          rating: nurse.rating,
          specialty: nurse.specialty,
          coords: nurse.coords
        }))
      });
    } else {
      res.json({
        found: false,
        message: 'No nurses available in your area at the moment. Please try again later.'
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Request a nurse
app.post('/request-nurse', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const userId = req.user.userId;
    
    // Create a new booking
    const booking = {
      id: bookings.length + 1,
      userId,
      status: 'pending', // pending, matched, in_progress, completed, cancelled
      userCoords: { latitude, longitude },
      userAddress: address,
      createdAt: new Date()
    };
    
    bookings.push(booking);
    
    // In a real app, you would match with an available nurse
    // For demo, we'll simulate matching after a delay
    
    res.json({
      success: true,
      bookingId: booking.id,
      message: 'Looking for available nurses...'
    });
    
    // Simulate nurse matching after 5 seconds
    setTimeout(() => {
      const availableNurses = nurses.filter(n => n.available && n.socketId);
      
      if (availableNurses.length > 0) {
        const matchedNurse = availableNurses[0];
        
        // Update booking status
        booking.status = 'matched';
        booking.nurseId = matchedNurse.id;
        booking.nurseCoords = matchedNurse.coords;
        
        // Notify user via socket
        const userSocket = Object.values(io.sockets.sockets).find(
          socket => socket.userId === userId
        );
        
        if (userSocket) {
          userSocket.emit('nurse-matched', {
            nurse: {
              id: matchedNurse.id,
              name: matchedNurse.name,
              imageUrl: matchedNurse.imageUrl,
              rating: matchedNurse.rating,
              specialty: matchedNurse.specialty,
              coords: matchedNurse.coords
            }
          });
        }
        
        // Notify nurse via socket
        if (matchedNurse.socketId) {
          io.to(matchedNurse.socketId).emit('booking-assigned', {
            bookingId: booking.id,
            user: users.find(u => u.id === userId),
            userCoords: { latitude, longitude },
            userAddress: address
          });
        }
      } else {
        // No nurses available
        const userSocket = Object.values(io.sockets.sockets).find(
          socket => socket.userId === userId
        );
        
        if (userSocket) {
          userSocket.emit('nurse-cancelled', {
            message: 'No nurses available at the moment. Please try again later.'
          });
        }
      }
    }, 5000);
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm nurse arrival
app.post('/confirm-arrival', authenticateToken, (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.userId;
    
    const booking = bookings.find(b => b.id === bookingId && b.userId === userId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.status !== 'nurse_arrived') {
      return res.status(400).json({ message: 'Nurse has not arrived yet' });
    }
    
    // Update booking status
    booking.status = 'completed';
    booking.completedAt = new Date();
    
    // Notify nurse via socket
    const nurse = nurses.find(n => n.id === booking.nurseId);
    if (nurse && nurse.socketId) {
      io.to(nurse.socketId).emit('arrival-confirmed', {
        bookingId: booking.id
      });
    }
    
    res.json({ success: true, message: 'Arrival confirmed successfully' });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', (data) => {
    try {
      const { token } = data;
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          socket.emit('authentication-error', { message: 'Invalid token' });
          return;
        }
        
        socket.userId = decoded.userId;
        socket.emit('authenticated', { userId: decoded.userId });
        console.log(`User ${decoded.userId} authenticated on socket ${socket.id}`);
      });
    } catch (error) {
      socket.emit('authentication-error', { message: 'Authentication failed' });
    }
  });
  
  // Handle nurse registration
  socket.on('register-nurse', (data) => {
    try {
      const { nurseId } = data;
      const nurse = nurses.find(n => n.id === nurseId);
      
      if (nurse) {
        nurse.socketId = socket.id;
        socket.nurseId = nurseId;
        console.log(`Nurse ${nurseId} registered on socket ${socket.id}`);
        
        socket.emit('nurse-registered', { success: true });
      } else {
        socket.emit('nurse-registered', { success: false, message: 'Nurse not found' });
      }
    } catch (error) {
      socket.emit('nurse-registered', { success: false, message: 'Registration failed' });
    }
  });
  
  // Handle nurse location updates
  socket.on('nurse-location-update', (data) => {
    try {
      const { nurseId, coords } = data;
      const nurse = nurses.find(n => n.id === nurseId);
      
      if (nurse && nurse.socketId === socket.id) {
        // Update nurse coordinates
        nurse.coords = coords;
        
        // Find active booking for this nurse
        const activeBooking = bookings.find(
          b => b.nurseId === nurseId && (b.status === 'matched' || b.status === 'in_progress')
        );
        
        if (activeBooking) {
          // Notify user about nurse location update
          const userSocket = Object.values(io.sockets.sockets).find(
            s => s.userId === activeBooking.userId
          );
          
          if (userSocket) {
            userSocket.emit('nurse-location-update', {
              nurseId,
              coords
            });
          }
        }
        
        // Check if nurse is near any pending bookings
        bookings
          .filter(b => b.status === 'pending')
          .forEach(booking => {
            // Simple distance calculation (in real app, use proper formula)
            const distance = Math.sqrt(
              Math.pow(coords.latitude - booking.userCoords.latitude, 2) +
              Math.pow(coords.longitude - booking.userCoords.longitude, 2)
            );
            
            if (distance < 0.01) { // ~1km radius
              const userSocket = Object.values(io.sockets.sockets).find(
                s => s.userId === booking.userId
              );
              
              if (userSocket) {
                userSocket.emit('nurse-nearby', {
                  nurse: {
                    id: nurse.id,
                    name: nurse.name,
                    imageUrl: nurse.imageUrl,
                    rating: nurse.rating,
                    specialty: nurse.specialty,
                    coords: nurse.coords
                  }
                });
              }
            }
          });
      }
    } catch (error) {
      console.error('Error updating nurse location:', error);
    }
  });
  
  // Handle nurse reached destination
  socket.on('nurse-reached', (data) => {
    try {
      const { bookingId } = data;
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking && socket.nurseId === booking.nurseId) {
        booking.status = 'nurse_arrived';
        
        // Notify user
        const userSocket = Object.values(io.sockets.sockets).find(
          s => s.userId === booking.userId
        );
        
        if (userSocket) {
          userSocket.emit('nurse-reached', {
            nurse: nurses.find(n => n.id === booking.nurseId)
          });
        }
      }
    } catch (error) {
      console.error('Error handling nurse reached:', error);
    }
  });
  
  // Handle booking acceptance by nurse
  socket.on('accept-booking', (data) => {
    try {
      const { bookingId } = data;
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking && socket.nurseId === booking.nurseId) {
        booking.status = 'in_progress';
        
        // Notify user
        const userSocket = Object.values(io.sockets.sockets).find(
          s => s.userId === booking.userId
        );
        
        if (userSocket) {
          userSocket.emit('booking-accepted', {
            nurse: nurses.find(n => n.id === booking.nurseId)
          });
        }
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  });
  
  // Handle booking rejection by nurse
  socket.on('reject-booking', (data) => {
    try {
      const { bookingId } = data;
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking && socket.nurseId === booking.nurseId) {
        booking.status = 'cancelled';
        
        // Notify user
        const userSocket = Object.values(io.sockets.sockets).find(
          s => s.userId === booking.userId
        );
        
        if (userSocket) {
          userSocket.emit('nurse-cancelled', {
            message: 'The nurse has cancelled the booking. Looking for another nurse...'
          });
        }
        
        // Try to find another nurse
        setTimeout(() => {
          const availableNurses = nurses.filter(n => n.available && n.socketId && n.id !== booking.nurseId);
          
          if (availableNurses.length > 0) {
            const newNurse = availableNurses[0];
            booking.status = 'matched';
            booking.nurseId = newNurse.id;
            booking.nurseCoords = newNurse.coords;
            
            // Notify user
            if (userSocket) {
              userSocket.emit('nurse-matched', {
                nurse: {
                  id: newNurse.id,
                  name: newNurse.name,
                  imageUrl: newNurse.imageUrl,
                  rating: newNurse.rating,
                  specialty: newNurse.specialty,
                  coords: newNurse.coords
                }
              });
            }
            
            // Notify new nurse
            io.to(newNurse.socketId).emit('booking-assigned', {
              bookingId: booking.id,
              user: users.find(u => u.id === booking.userId),
              userCoords: booking.userCoords,
              userAddress: booking.userAddress
            });
          } else {
            // No other nurses available
            if (userSocket) {
              userSocket.emit('nurse-cancelled', {
                message: 'No nurses available at the moment. Please try again later.'
              });
            }
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clear nurse socket reference
    if (socket.nurseId) {
      const nurse = nurses.find(n => n.id === socket.nurseId);
      if (nurse) {
        nurse.socketId = null;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});