const express = require('express');
const router = express.Router();
const { createAppointment, getPendingAppointments, updateAppointmentStatus } = require('../controllers/appointmentController');
const protect = require('../middlewares/authMiddleware');


// Apply auth middleware to all routes
router.use(protect);

// POST - Create new appointment
router.post('/createAppointment', createAppointment);

// GET - Get pending appointments only
router.get('/getAppointment', getPendingAppointments);

// PATCH - Update appointment status
router.patch('/:bookingId', updateAppointmentStatus);

module.exports = router;