const Nurse = require('../models/Nurse');
const generateToken = require('../utils/generateToken');
const { encrypt } = require('../utils/encryption');

// Add new nurse
exports.addNurse = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            password,
            socialIdentityType,
            socialIdentityNumber,
            licenseNumber,
            licenseState,
            yearsOfExperience,
            specialization,
            dateOfBirth,
            address,
            coords,
            status,
            fcm
        } = req.body;

        if (!firstName || !lastName || !email || !phoneNumber || !password || 
            !licenseNumber || !licenseState || !yearsOfExperience || !specialization || 
            !dateOfBirth || !address) {
            return res.status(400).json({ 
                message: 'All fields are required except socialIdentityType, socialIdentityNumber, coords, and fcm' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check for existing nurses with the same unique fields
        // Since the data comes decrypted from the database, we can compare directly
        const existingNurse = await Nurse.findOne({
            $or: [
                { email: email },
                { phoneNumber: phoneNumber },
                { licenseNumber: licenseNumber },
                ...(socialIdentityNumber ? [{ socialIdentityNumber: socialIdentityNumber }] : [])
            ]
        });

        if (existingNurse) {
            // Determine which field caused the conflict by comparing decrypted values
            let conflictField = '';

            if (existingNurse.email === email) {
                conflictField = 'email';
            } else if (existingNurse.phoneNumber === phoneNumber) {
                conflictField = 'phone number';
            } else if (existingNurse.licenseNumber === licenseNumber) {
                conflictField = 'license number';
            } else if (socialIdentityNumber && existingNurse.socialIdentityNumber === socialIdentityNumber) {
                conflictField = 'social identity number';
            }

            return res.status(400).json({ 
                message: `Nurse with this ${conflictField} already exists`,
                errorType: conflictField.replace(' ', '')
            });
        }

        // Create new nurse
        const newNurse = new Nurse({
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email,
            phoneNumber,
            password,
            socialIdentityType: socialIdentityType || '',
            socialIdentityNumber: socialIdentityNumber || '',
            licenseNumber,
            licenseState,
            yearsOfExperience: parseInt(yearsOfExperience),
            specialization,
            dateOfBirth: new Date(dateOfBirth),
            address,
            status: status || 'pending',
            coords: coords ? { latitude: coords.latitude, longitude: coords.longitude } : { latitude: null, longitude: null },
            socketId: null,
            fcm: fcm || null
        });

        await newNurse.save();

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
                yearsOfExperience: newNurse.yearsOfExperience,
                fcm: newNurse.fcm
            },
            token 
        });
    } catch (error) {
        console.error('Error adding nurse:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `Nurse with this ${field} already exists`,
                errorType: field
            });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Nurse Login
exports.loginNurse = async (req, res) => {
    try {
        const { email, password, fcm } = req.body;
        console.log(password,email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const encryptedEmail = encrypt(email);
        console.log(encryptedEmail,"encryptedddd");
        const nurse = await Nurse.findOne({ email: encryptedEmail });
        console.log(nurse);

        if (!nurse) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (nurse.status === 'unVerified' || nurse.status === 'pending') {
            return res.status(401).json({ message: 'Account is not active. Please contact administrator.' });
        }

        const decryptedPassword = nurse.password; // post-find hook decrypts
        console.log(password,email,decryptedPassword);
        if (password !== decryptedPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update FCM token if provided
        if (fcm) {
            nurse.fcm = fcm;
            await nurse.save();
        }

        const token = generateToken(nurse._id);

        return res.status(200).json({ 
            message: "Login successful", 
            nurse: {
                id: nurse._id,
                firstName: nurse.firstName,
                lastName: nurse.lastName,
                name: nurse.name,
                email: nurse.email,
                phoneNumber: nurse.phoneNumber,
                status: nurse.status,
                specialization: nurse.specialization,
                yearsOfExperience: nurse.yearsOfExperience,
                coords: nurse.coords,
                fcm: nurse.fcm
            },
            token 
        });
    } catch (error) {
        console.error('Error during nurse login:', error);
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
        const nurseId = req.user.id;
        const updateData = { ...req.body };

        const nurse = await Nurse.findById(nurseId);
        if (!nurse) {
            return res.status(404).json({ message: 'Nurse not found' });
        }

        // Update fields
        Object.keys(updateData).forEach(field => {
            if (field !== 'firstName' && field !== 'lastName' && field !== 'name') {
                nurse[field] = updateData[field];
            }
        });

        // Handle name fields specially
        if (updateData.firstName || updateData.lastName) {
            const firstName = updateData.firstName || nurse.firstName;
            const lastName = updateData.lastName || nurse.lastName;
            nurse.firstName = firstName;
            nurse.lastName = lastName;
            nurse.name = `${firstName} ${lastName}`;
        }

        // Convert types
        if (updateData.yearsOfExperience) {
            nurse.yearsOfExperience = parseInt(updateData.yearsOfExperience);
        }
        if (updateData.dateOfBirth) {
            nurse.dateOfBirth = new Date(updateData.dateOfBirth);
        }

        const updatedNurse = await nurse.save(); // This triggers your encryption hooks

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

exports.getAllNurses = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, id } = req.query;
        
        // If ID is provided, return specific nurse in array format
        if (id) {
            const nurse = await Nurse.findById(id)
                .select('-password -socialIdentityType -socialIdentityNumber -licenseNumber -licenseState -address'); // Exclude sensitive data
            
            if (!nurse) {
                return res.status(404).json({ 
                    message: 'Nurse not found',
                    nurses: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalNurses: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }

            return res.status(200).json({ 
                message: "Nurse retrieved successfully", 
                nurses: [nurse], // Send as array with single item
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalNurses: 1,
                    hasNext: false,
                    hasPrev: false
                }
            });
        }

        // Otherwise, proceed with search and pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        let searchQuery = {};
        
        if (search) {
            const searchRegex = new RegExp(encrypt(search), 'i');
            searchQuery = {
                $or: [
                    { name: searchRegex },
                    { specialization: searchRegex },
                    { firstName: searchRegex },
                    { lastName: searchRegex }
                ]
            };
        }

        // Get nurses with search, sorting, and pagination
        const nurses = await Nurse.find(searchQuery)
            .select('-password -socialIdentityType -socialIdentityNumber -licenseNumber -licenseState -address') // Exclude sensitive data
            .sort({ 
                rating: -1, // Sort by rating descending first
                createdAt: -1 // Then by creation date
            })
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination info
        const totalNurses = await Nurse.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalNurses / limitNum);

        return res.status(200).json({ 
            message: "Nurses retrieved successfully", 
            nurses: nurses, // Array of nurses
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalNurses: totalNurses,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Error getting nurses:', error);
        
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid nurse ID format',
                nurses: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalNurses: 0,
                    hasNext: false,
                    hasPrev: false
                }
            });
        }
        
        return res.status(500).json({ 
            message: 'Internal server error',
            nurses: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalNurses: 0,
                hasNext: false,
                hasPrev: false
            }
        });
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

exports.getNursesInRadius = async (req, res) => {
    try {
        const { latitude, longitude, page = 1, limit = 10 } = req.query;

        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({ 
                message: 'Latitude and longitude are required' 
            });
        }

        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({ 
                message: 'Invalid latitude or longitude format' 
            });
        }

        // Earth radius in kilometers
        const earthRadiusKm = 6371;
        const radiusInKm = 150;

        // MongoDB aggregation pipeline for geospatial query
        const nurses = await Nurse.aggregate([
            {
                $match: {
                    'coords.latitude': { $ne: null },
                    'coords.longitude': { $ne: null },
                    status: { $in: ['active', 'engaged'] } // Only active nurses
                }
            },
            {
                $addFields: {
                    distance: {
                        $multiply: [
                            earthRadiusKm,
                            {
                                $acos: {
                                    $add: [
                                        {
                                            $multiply: [
                                                { $sin: { $degreesToRadians: userLat } },
                                                { $sin: { $degreesToRadians: '$coords.latitude' } }
                                            ]
                                        },
                                        {
                                            $multiply: [
                                                { $cos: { $degreesToRadians: userLat } },
                                                { $cos: { $degreesToRadians: '$coords.latitude' } },
                                                { $cos: { $degreesToRadians: { $subtract: [userLng, '$coords.longitude'] } } }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    distance: { $lte: radiusInKm }
                }
            },
            {
                $sort: { 
                    rating: -1, // Sort by rating first
                    distance: 1 // Then by distance
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limitNum
            },
            {
                $project: {
                    password: 0,
                    socialIdentityType: 0,
                    socialIdentityNumber: 0,
                    licenseNumber: 0,
                    licenseState: 0,
                    address: 0,
                    socketId: 0,
                    createdAt: 0,
                    updatedAt: 0
                }
            }
        ]);

        // Get total count for pagination
        const totalCount = await Nurse.aggregate([
            {
                $match: {
                    'coords.latitude': { $ne: null },
                    'coords.longitude': { $ne: null },
                    status: { $in: ['active', 'engaged'] }
                }
            },
            {
                $addFields: {
                    distance: {
                        $multiply: [
                            earthRadiusKm,
                            {
                                $acos: {
                                    $add: [
                                        {
                                            $multiply: [
                                                { $sin: { $degreesToRadians: userLat } },
                                                { $sin: { $degreesToRadians: '$coords.latitude' } }
                                            ]
                                        },
                                        {
                                            $multiply: [
                                                { $cos: { $degreesToRadians: userLat } },
                                                { $cos: { $degreesToRadians: '$coords.latitude' } },
                                                { $cos: { $degreesToRadians: { $subtract: [userLng, '$coords.longitude'] } } }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    distance: { $lte: radiusInKm }
                }
            },
            {
                $count: 'total'
            }
        ]);

        const totalNurses = totalCount.length > 0 ? totalCount[0].total : 0;
        const totalPages = Math.ceil(totalNurses / limitNum);

        // Decrypt nurse data and format response
        const formattedNurses = nurses.map((nurse, index) => {
            // Assign medals based on ranking (top 3 get medals, others get none)
            let medal = 'none';
            if (index === 0) medal = 'gold';
            else if (index === 1) medal = 'silver';
            else if (index === 2) medal = 'bronze';

            // Decrypt sensitive fields
            const decryptedFirstName = decrypt(nurse.firstName);
            const decryptedLastName = decrypt(nurse.lastName);
            const decryptedSpecialty = decrypt(nurse.specialization);

            return {
                id: nurse._id.toString(),
                name: `${decryptedFirstName} ${decryptedLastName}`,
                specialty: decryptedSpecialty,
                experience: `${nurse.yearsOfExperience} years`,
                rating: nurse.rating || 4.0, // Default rating if not set
                distance: `${nurse.distance.toFixed(1)} km`,
                image: nurse.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
                medal: medal,
                coords: nurse.coords,
                status: nurse.status,
                fcm: nurse.fcm
            };
        });

        // If no specific ordering is needed, you can also assign medals randomly
        const nursesWithRandomMedals = formattedNurses.map(nurse => {
            // Random medal assignment (optional - remove if you want ranking-based medals)
            const medals = ['gold', 'silver', 'bronze', 'none', 'none', 'none'];
            const randomMedal = medals[Math.floor(Math.random() * medals.length)];
            
            return {
                ...nurse,
                medal: randomMedal
            };
        });

        return res.status(200).json({ 
            message: "Nurses retrieved successfully", 
            nurses: nursesWithRandomMedals, // Use random medals version
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalNurses: totalNurses,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            },
            location: {
                userLatitude: userLat,
                userLongitude: userLng,
                radius: radiusInKm
            }
        });
    } catch (error) {
        console.error('Error getting nurses in radius:', error);
        return res.status(500).json({ 
            message: 'Internal server error',
            nurses: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalNurses: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
};
