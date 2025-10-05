const express = require('express');
const { getAssessment, updateAssessment } = require('../controllers/assessmentDataController');
const protect = require('../middlewares/authMiddleware');
const router = express.Router();


// Only two routes as requested
router.get('/getAssessment', protect, getAssessment);
router.post('/updateAssessment', protect, updateAssessment);

module.exports = router;