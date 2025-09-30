const express = require('express');
const router = express.Router();
const { createPaymentIntent, getPaymentIntent } = require('../controllers/paymentController');

router.post('/create-payment-intent', createPaymentIntent);
router.get('/payment-intent/:id', getPaymentIntent);

module.exports = router;
