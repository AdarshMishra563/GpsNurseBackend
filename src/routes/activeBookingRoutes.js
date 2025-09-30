const express = require('express');
const router = express.Router();
const activeBookingController = require('../controllers/activeBookingController');
const protect = require('../middlewares/authMiddleware'); // use your protect middleware

// resume by user or nurse (client should call with user token)

router.get('/resume', protect, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1️⃣ Find user or nurse in DB to get role
    let role;
    let userDoc = await User.findById(userId).lean();
    if (userDoc) {
      role = 'user';
    } else {
      let nurseDoc = await Nurse.findById(userId).lean();
      if (nurseDoc) {
        role = 'nurse';
      } else {
        return res.status(404).json({ message: 'User/Nurse not found' });
      }
    }

    // 2️⃣ Build query based on role
    const query = role === 'nurse' ? { nurseId: userId } : { userId };
    
    // 3️⃣ Fetch active booking
    const active = await ActiveBooking.findOne(query).lean();
    if (!active) return res.status(404).json({ message: 'No active booking' });

    // 4️⃣ Return booking + role info
    return res.json({ active, requester: { id: userId, role } });
  } catch (err) {
    console.error('resume error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/activeBooking',protect, activeBookingController.getActiveBookingByUserOrNurse);


router.post('/:bookingId/payment', protect, activeBookingController.updatePayment);


router.post('/:bookingId/complete', protect, activeBookingController.completeBooking);
router.post('/:bookingId/cancel', protect, activeBookingController.cancelBooking);
router.get('/allBookings', protect, activeBookingController.getNonPendingBookings);

module.exports = router;
