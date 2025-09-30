const express = require('express');
const nurseController = require('../controllers/nurseController');
const protect = require('../middlewares/authMiddleware');
const router = express.Router();
router.post('/addNurse', nurseController.addNurse);
router.get('/allNurses', nurseController.getAllNurses);

// Get nurse status
router.get('/myStatus',protect, nurseController.getNurseStatus);

// Get nurse profile
router.get('/me',protect, nurseController.getNurse);

// Update nurse profile
router.put('/nurseUpdate',protect, nurseController.updateNurse);

router.patch('/coords',protect, nurseController.updateNurseCoords);

// Update nurse status
router.patch('/status',protect, nurseController.updateNurseStatus);

module.exports = router;
