const Nurse = require('../models/Nurse');
const generateToken = require('../utils/generateToken');

// Add new nurse
exports.addNurse = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            socialIdentityType,
            socialIdentityNumber,
            licenseNumber,
            licenseState,
            yearsOfExperience,
            specialization,
            dateOfBirth,
            address,
            coords,
            status
        } = req.body;

        // Validate required fields (coords are optional now)
        if (!firstName || !lastName || !email || !phoneNumber || !licenseNumber || 
            !licenseState || !yearsOfExperience || !specialization || !dateOfBirth || !address) {
            return res.status(400).json({ 
                message: 'All fields are required except socialIdentityType, socialIdentityNumber, and coords' 
            });
        }

        // Just create the nurse - duplicate checks will be handled by MongoDB unique constraints
        // and the pre-save hooks in the model will handle encryption
        const newNurse = new Nurse({
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email,
            phoneNumber,
            socialIdentityType: socialIdentityType || '',
            socialIdentityNumber: socialIdentityNumber || '',
            licenseNumber,
            licenseState,
            yearsOfExperience: parseInt(yearsOfExperience),
            specialization,
            dateOfBirth: new Date(dateOfBirth),
            address,
            status: status || 'pending',
            coords: coords ? {
                latitude: coords.latitude,
                longitude: coords.longitude
            } : { latitude: null, longitude: null },
            socketId: null
        });
console.log(newNurse)
        await newNurse.save();

        // Generate JWT token
        const token = generateToken(newNurse._id);

        return res.status(201).json({ 
            message: "Nurse successfully added", 
            nurse: {
                id: newNurse._id,
                firstName: newNurse.firstName,
                lastName: newNurse.lastName,
                name: newNurse.name,
                email: newNurse.email,
                phoneNumber: newNurse.phoneNumber,
                status: newNurse.status,
                specialization: newNurse.specialization,
                yearsOfExperience: newNurse.yearsOfExperience
            },
            token 
        });
    } catch (error) {
        console.error('Error adding nurse:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000) {
            // Handle duplicate key errors from MongoDB unique constraints
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `Nurse with this ${field} already exists`,
                errorType: field
            });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get nurse by ID (using middleware extracted user ID)
exports.getNurse = async (req, res) => {
    try {
        const nurseId = req.user.id; // From middleware
        const nurse = await Nurse.findById(nurseId);
        
        if (!nurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        return res.status(200).json({ 
            message: "Nurse retrieved successfully", 
            nurse: nurse 
        });
    } catch (error) {
        console.error('Error getting nurse:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update nurse by ID (using middleware extracted user ID)
exports.updateNurse = async (req, res) => {
    try {
        const nurseId = req.user.id; // From middleware
        const updateData = { ...req.body };

        // If firstName or lastName is updated, also update the name field
        if (updateData.firstName || updateData.lastName) {
            const nurse = await Nurse.findById(nurseId);
            const firstName = updateData.firstName || nurse.firstName;
            const lastName = updateData.lastName || nurse.lastName;
            updateData.name = `${firstName} ${lastName}`;
        }

        // Convert yearsOfExperience to number if provided
        if (updateData.yearsOfExperience) {
            updateData.yearsOfExperience = parseInt(updateData.yearsOfExperience);
        }

        // Convert dateOfBirth to Date object if provided
        if (updateData.dateOfBirth) {
            updateData.dateOfBirth = new Date(updateData.dateOfBirth);
        }

        const updatedNurse = await Nurse.findByIdAndUpdate(
            nurseId, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!updatedNurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        return res.status(200).json({ 
            message: "Nurse updated successfully", 
            nurse: updatedNurse 
        });
    } catch (error) {
        console.error('Error updating nurse:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000) {
            // Handle duplicate key errors from MongoDB unique constraints
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `Nurse with this ${field} already exists`,
                errorType: field
            });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get nurse status (using middleware extracted user ID)
exports.getNurseStatus = async (req, res) => {
    try {
        const nurseId = req.user.id; // From middleware
        const nurse = await Nurse.findById(nurseId);
        
        if (!nurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        return res.status(200).json({ 
            message: "Status retrieved successfully", 
            status: nurse.status,
            nurseId: nurse._id
        });
    } catch (error) {
        console.error('Error getting nurse status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all nurses (optional additional route)
exports.getAllNurses = async (req, res) => {
    try {
        const nurses = await Nurse.find().sort({ createdAt: -1 });
        return res.status(200).json({ 
            message: "Nurses retrieved successfully", 
            nurses: nurses 
        });
    } catch (error) {
        console.error('Error getting nurses:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// Update nurse coordinates (using middleware extracted user ID)
exports.updateNurseCoords = async (req, res) => {
    try {
        const nurseId = req.user.id; // From middleware
        const { latitude, longitude } = req.body;

        // Validate coordinates
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
                message: 'Latitude and longitude are required' 
            });
        }

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return res.status(400).json({ 
                message: 'Latitude and longitude must be numbers' 
            });
        }

        const updatedNurse = await Nurse.findByIdAndUpdate(
            nurseId, 
            { 
                coords: {
                    latitude: latitude,
                    longitude: longitude
                }
            }, 
            { new: true, runValidators: true }
        );

        if (!updatedNurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        return res.status(200).json({ 
            message: "Coordinates updated successfully", 
            nurse: {
                id: updatedNurse._id,
                coords: updatedNurse.coords
            }
        });
    } catch (error) {
        console.error('Error updating nurse coordinates:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update nurse status (using middleware extracted user ID)
exports.updateNurseStatus = async (req, res) => {
    try {
        const nurseId = req.user.id; // From middleware
        const { status } = req.body;

        // Validate status
        if (!status || !['inactive', 'active', 'inProgress'].includes(status)) {
            return res.status(400).json({ 
                message: 'Valid status is required (inactive, active, inProgress)' 
            });
        }

        const updatedNurse = await Nurse.findByIdAndUpdate(
            nurseId, 
            { status }, 
            { new: true, runValidators: true }
        );

        if (!updatedNurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        return res.status(200).json({ 
            message: "Status updated successfully", 
            nurse: {
                id: updatedNurse._id,
                status: updatedNurse.status
            }
        });
    } catch (error) {
        console.error('Error updating nurse status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};