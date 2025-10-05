const Assessment = require('../models/Assessment');

// @desc    Get assessment data by bookingId
// @route   GET /api/assessment/getAssessment
// @access  Private
const getAssessment = async (req, res) => {
  try {
    const { bookingId, userId, nurseId } = req.query;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Find assessment by bookingId (primary)
    let assessment = await Assessment.findOne({ 
      bookingId: bookingId 
    });

    if (!assessment) {
      // If no assessment found, check with all parameters
      const query = { bookingId };
      if (userId) query.userId = userId;
      if (nurseId) query.nurseId = nurseId;
      
      assessment = await Assessment.findOne(query);
    }

    if (!assessment) {
      return res.status(200).json({
        success: true,
        message: 'No assessment data found',
        assessment: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Assessment data retrieved successfully',
      assessment
    });

  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assessment data'
    });
  }
};

// Helper function to clean undefined and empty object values
const cleanObjectValues = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  // If it's an empty object, return as is
  if (Object.keys(obj).length === 0) return obj;
  
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Keep the value if it's not undefined and not null
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively clean nested objects
        const cleanedNested = cleanObjectValues(value);
        
        // Only add if the nested object is not empty or if it's explicitly an empty object
        if (Object.keys(cleanedNested).length > 0 || value === {}) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};

// Helper function to safely merge nested objects including empty ones
const safeMergeObjects = (target, source) => {
  // If target doesn't exist, return source (even if empty)
  if (!target || typeof target !== 'object') return source;
  
  // If source is empty object, return target as is (don't override with empty)
  if (source && typeof source === 'object' && Object.keys(source).length === 0) {
    return target;
  }
  
  if (!source || typeof source !== 'object') return target;
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    // Only process if source value is defined and not null
    if (sourceValue !== undefined && sourceValue !== null) {
      if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        // Handle empty objects in source
        if (Object.keys(sourceValue).length === 0) {
          // If source is empty object, keep the target value
          if (targetValue !== undefined) {
            result[key] = targetValue;
          }
        } else {
          // If both are objects, merge recursively
          if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
            result[key] = safeMergeObjects(targetValue, sourceValue);
          } else {
            result[key] = sourceValue;
          }
        }
      } else {
        // For non-object values, always use source value
        result[key] = sourceValue;
      }
    }
  });
  
  return result;
};

// Helper to initialize empty objects for nested structures
const initializeEmptyObjects = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const initialized = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // If it's an empty object, keep it as is
        if (Object.keys(value).length === 0) {
          initialized[key] = value;
        } else {
          // Recursively initialize nested objects
          initialized[key] = initializeEmptyObjects(value);
        }
      } else {
        initialized[key] = value;
      }
    }
  });
  
  return initialized;
};

// @desc    Create or update assessment data
// @route   POST /api/assessment/updateAssessment
// @access  Private
const updateAssessment = async (req, res) => {
  try {
    const { bookingId, userId, nurseId, ...updateFields } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    console.log('Received update fields:', JSON.stringify(updateFields, null, 2));

    // Clean updateFields to remove undefined values but keep empty objects
    const cleanedUpdateFields = cleanObjectValues(updateFields);
    
    // Initialize empty objects to ensure proper structure
    const initializedUpdateFields = initializeEmptyObjects(cleanedUpdateFields);

    console.log('Cleaned update fields:', JSON.stringify(cleanedUpdateFields, null, 2));

    // Find existing assessment
    let assessment = await Assessment.findOne({ bookingId });

    if (assessment) {
      console.log('Found existing assessment, updating...');
      
      // Update existing assessment - only update the fields that are provided
      Object.keys(initializedUpdateFields).forEach(field => {
        const updateValue = initializedUpdateFields[field];
        
        if (updateValue !== undefined && updateValue !== null) {
          console.log(`Updating field: ${field}`, updateValue);
          
          // If it's an object, merge it safely, otherwise replace
          if (typeof updateValue === 'object' && !Array.isArray(updateValue)) {
            // Handle empty objects specially
            if (Object.keys(updateValue).length === 0) {
              console.log(`Field ${field} is empty object, skipping merge`);
              // Don't override with empty object, keep existing data
            } else {
              // Safely merge nested objects
              assessment[field] = safeMergeObjects(assessment[field] || {}, updateValue);
            }
          } else {
            // For non-object values, always update
            assessment[field] = updateValue;
          }
        }
      });

      // Update timestamps
      assessment.updatedAt = new Date();

      console.log('Saving assessment...');
      await assessment.save();
      console.log('Assessment saved successfully');

      res.status(200).json({
        success: true,
        message: 'Assessment updated successfully',
        assessment
      });

    } else {
      console.log('No existing assessment found, creating new one...');
      
      // Create new assessment with only defined values
      assessment = await Assessment.create({
        bookingId,
        userId: userId || null,
        nurseId: nurseId || null,
        ...initializedUpdateFields,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('New assessment created successfully');

      res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        assessment
      });
    }

  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving assessment data'
    });
  }
};

module.exports = {
  getAssessment,
  updateAssessment
};