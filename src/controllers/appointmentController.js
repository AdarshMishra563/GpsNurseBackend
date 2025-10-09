const Appointment = require('../models/Appointment');

// 1. CREATE appointment - store data as plain fields
exports.createAppointment = async (req, res) => {
    try {
        const { 
            bookingId, 
            nurseId, 
            amount, 
            distance,
            token,
            userCoords,
            nurseCoords,
            nurseData,rating,
            eventDate,
            status = 'pending'
        } = req.body;
        
        const userId = req.user.id;

        // Validate required fields
        if (!bookingId || !nurseId || !amount) {
            return res.status(400).json({ 
                message: 'Missing required fields: bookingId, nurseId, amount' 
            });
        }

        // Check if appointment already exists
        const existingAppointment = await Appointment.findOne({ bookingId });
        if (existingAppointment) {
            return res.status(409).json({ 
                message: 'Appointment already exists for this booking ID' 
            });
        }

        // Create appointment with plain fields
        const appointment = await Appointment.create({
            bookingId,
            nurseId,
            userId,
            amount,
            distance: distance || 0,
            token: token || '',
            status,eventDate,
            rating:nurseData.rating,
            // Nurse data as plain fields
            nurseName: nurseData?.name || '',
            nurseEmail: nurseData?.email || '',
            nursePhoneNumber: nurseData?.phoneNumber || '',
            nurseSpecialization: nurseData?.specialization || '',
            nurseYearsOfExperience: nurseData?.yearsOfExperience || 0,
            nurseImage: nurseData?.image || '',
            
            // Coordinates as plain fields
            userLatitude: userCoords?.latitude || 0,
            userLongitude: userCoords?.longitude || 0,
            nurseLatitude: nurseCoords?.latitude || 0,
            nurseLongitude: nurseCoords?.longitude || 0,
            
            statusHistory: [{
                status: status,
                changedBy: 'system'
            }]
        });

        return res.status(201).json({
            message: 'Appointment created successfully',
            appointment
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'Booking ID already exists' 
            });
        }
        
        return res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
};

// 2. GET only pending appointments ✅ FILTERS BY PENDING STATUS
exports.getPendingAppointments = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find only appointments with status = 'pending'
        const appointments = await Appointment.find({
            status: 'pending',  // ✅ FILTERING BY PENDING STATUS
            $or: [
                { nurseId: userId },
                { userId: userId }
            ]
        })
        .sort({ createdAt: -1 })
        .select('-__v');

        return res.status(200).json({
            message: 'Pending appointments retrieved successfully',
            count: appointments.length,
            appointments
        });

    } catch (error) {
        console.error('Error getting pending appointments:', error);
        return res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
};

// 3. UPDATE appointment status
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, changedBy = 'system' } = req.body;
        const userId = req.user.id;

        // Validate status
        const validStatuses = ['pending', 'accepted', 'completed', 'cancelled', 'in_progress', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status' 
            });
        }

        // Find appointment
        const appointment = await Appointment.findOne({ bookingId });
        if (!appointment) {
            return res.status(404).json({ 
                message: 'Appointment not found' 
            });
        }

        // Check authorization
        if (appointment.nurseId !== userId && appointment.userId !== userId) {
            return res.status(403).json({ 
                message: 'Not authorized to update this appointment' 
            });
        }

        // Update status
        appointment.status = status;
        appointment.statusHistory.push({
            status: status,
            changedBy: changedBy
        });

        await appointment.save();

        return res.status(200).json({
            message: 'Appointment status updated successfully',
            appointment
        });

    } catch (error) {
        console.error('Error updating appointment status:', error);
        return res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
};