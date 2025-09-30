// stripeController.js
require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create PaymentIntent
 * body: { amount: number, currency?: string, payment_method_types?: string[] }
 */
async function createPaymentIntent(req, res) {
  try {
    const { amount = 10000, currency = 'inr', payment_method_types = [ 'card'] } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types,
      metadata: { integration_check: 'accept_a_payment' },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Retrieve PaymentIntent
 */
async function getPaymentIntent(req, res) {
  try {
    const pi = await stripe.paymentIntents.retrieve(req.params.id);
    res.json(pi);
  } catch (err) {
    console.error('retrieve payment-intent error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Optional: Central event handler for webhooks
 */
function handleStripeEvent(event) {
  console.log('Received Stripe event:', event.type);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      // TODO: mark order/booking as paid in DB
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent failed:', paymentIntent.id, paymentIntent.last_payment_error);
      break;
    }
    case 'payment_intent.processing': {
      console.log('PaymentIntent processing', event.data.object.id);
      break;
    }
    case 'payment_intent.requires_action':
      console.log('PaymentIntent requires action', event.data.object.id);
      break;
    default:
      console.log('Unhandled event type', event.type);
  }
}

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  handleStripeEvent,
};
