const express = require('express');
const { getNearbyNurses, createBooking, acceptBooking, getActiveBooking } = require('../controllers/bookingController');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
router.get('/nearby',getNearbyNurses);
router.post('/book',protect,createBooking);
router.post('/book/accepted',protect,acceptBooking);
router.get('/active/:bookingId',protect,getActiveBooking);

module.exports = router;
