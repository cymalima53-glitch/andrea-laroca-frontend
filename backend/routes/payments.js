const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');
const { sendOrderConfirmationEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
const SHIPPO_ORIGIN_ZIP = process.env.SHIPPO_ORIGIN_ZIP || '33101';

// ─── FLAT-RATE FALLBACK (when Shippo unavailable) ────────────────────────────
function calculateFlatRate(totalWeightLbs) {
    if (totalWeightLbs <= 5) return 8.00;
    if (totalWeightLbs <= 10) return 12.00;
    if (totalWeightLbs <= 20) return 18.00;
    return 25.00;
}

// ─── GET REAL RATE FROM SHIPPO ───────────────────────────────────────────────
async function getShippoRate(destinationZip, weight) {
    if (!SHIPPO_API_KEY || !destinationZip || destinationZip.length < 5) {
        return null;
    }

    try {
        const response = await axios.post(
            'https://api.goshippo.com/shipments/',
            {
                address_from: { zip: SHIPPO_ORIGIN_ZIP, country: 'US' },
                address_to: { zip: destinationZip, country: 'US' },
                parcels: [{
                    length: '10', width: '8', height: '6',
                    distance_unit: 'in',
                    weight: weight.toString(),
                    mass_unit: 'lb'
                }],
                async: false
            },
            {
                headers: {
                    'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        const rates = response.data.rates;
        const upsGround = rates.find(r => 
            r.servicelevel?.token === 'ups_ground' ||
            r.servicelevel?.name?.toLowerCase().includes('ground')
        );

        if (upsGround) {
            return {
                rate: parseFloat(upsGround.amount),
                days: parseInt(upsGround.days) || 3,
                service: upsGround.servicelevel?.name || 'UPS Ground'
            };
        }
        return null;
    } catch (err) {
        logger.error('Shippo API error:', { error: err.message, destinationZip, weight });
        return null;
    }
}

// ─── IDEMPOTENCY CHECK ───────────────────────────────────────────────────────
async function checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) return null;
    
    const result = await pool.query(
        'SELECT * FROM payment_idempotency WHERE idempotency_key = $1 AND expires_at > NOW()',
        [idempotencyKey]
    );
    
    return result.rows[0] || null;
}

async function saveIdempotency(idempotencyKey, paymentIntentId, orderId, status, response) {
    await pool.query(
        `INSERT INTO payment_idempotency (idempotency_key, payment_intent_id, order_id, status, response)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [idempotencyKey, paymentIntentId, orderId, status, JSON.stringify(response)]
    );
}

// ─── GET /api/payments/shipping-rate ─────────────────────────────────────────
// @desc  Calculate UPS Ground shipping cost (real via Shippo or flat-rate fallback)
// @access Public
router.post('/shipping-rate', asyncHandler(async (req, res) => {
    const { items, destination_zip } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    const totalWeightLbs = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Try to get real rate from Shippo if we have destination zip
    let shippoRate = null;
    if (destination_zip) {
        shippoRate = await getShippoRate(destination_zip, totalWeightLbs);
    }

    if (shippoRate) {
        return res.json({
            success: true,
            totalWeightLbs,
            shippingCost: shippoRate.rate,
            carrier: 'UPS Ground',
            estimatedDays: `${shippoRate.days}-5 business days`,
            realRate: true
        });
    }

    // Fallback to flat rate
    const shippingCost = calculateFlatRate(totalWeightLbs);
    res.json({
        success: true,
        totalWeightLbs,
        shippingCost,
        carrier: 'UPS Ground',
        estimatedDays: '3-5 business days',
        rateBreakdown: {
            '1-5 lbs': '$8.00',
            '6-10 lbs': '$12.00',
            '11-20 lbs': '$18.00',
            '20+ lbs': '$25.00',
        },
        realRate: false
    });
}));

// ─── POST /api/payments/create-intent ────────────────────────────────────────
// @desc  Create a Stripe PaymentIntent for retail checkout
// @access Public
router.post('/create-intent', asyncHandler(async (req, res) => {
    // Lazy-load Stripe so server starts fine even without keys yet
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
            error: 'Stripe not configured',
            message: 'Add STRIPE_SECRET_KEY to .env to enable payments'
        });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { items, customer_email, shippingCost, idempotencyKey } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    // Check idempotency - return cached response if exists
    if (idempotencyKey) {
        const cached = await checkIdempotency(idempotencyKey);
        if (cached) {
            logger.info(`Idempotency hit for key: ${idempotencyKey}`);
            return res.json(JSON.parse(cached.response));
        }
    }

    const client = await pool.connect();
    let subtotal = 0;

    try {
        // Calculate amount server-side — never trust client totals
        for (const item of items) {
            const result = await client.query(
                'SELECT price FROM products WHERE id = $1',
                [item.productId]
            );
            if (result.rows.length > 0) {
                subtotal += Number(result.rows[0].price) * item.quantity;
            }
        }

        const taxRate = 0.06; // Florida 6%
        const tax = subtotal * taxRate;
        const shipping = shippingCost || calculateFlatRate(
            items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        );
        const totalAmount = subtotal + tax + shipping;

        // Stripe expects amount in cents (integer)
        const amountInCents = Math.round(totalAmount * 100);

        // Create PaymentIntent with idempotency key
        const stripeOptions = {
            amount: amountInCents,
            currency: 'usd',
            receipt_email: customer_email,
            metadata: {
                order_type: 'retail',
                item_count: items.length.toString(),
                idempotency_key: idempotencyKey || 'none'
            },
        };

        // Add idempotency key to Stripe request if provided
        const stripeConfig = {};
        if (idempotencyKey) {
            stripeConfig.idempotencyKey = idempotencyKey;
        }

        const paymentIntent = await stripe.paymentIntents.create(
            stripeOptions, 
            stripeConfig
        );

        const response = {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            breakdown: {
                subtotal: subtotal.toFixed(2),
                tax: tax.toFixed(2),
                shipping: shipping.toFixed(2),
                total: totalAmount.toFixed(2),
            }
        };

        // Cache response for idempotency
        if (idempotencyKey) {
            await saveIdempotency(idempotencyKey, paymentIntent.id, null, 'created', response);
        }

        res.json(response);

    } catch (err) {
        logger.error('Stripe create-intent error:', { 
            error: err.message, 
            customer_email,
            items: items.length 
        });
        throw err;
    } finally {
        client.release();
    }
}));

// ─── POST /api/payments/confirm-order ────────────────────────────────────────
// @desc  Called after Stripe payment succeeds — creates order in DB
// @access Public
router.post('/confirm-order', asyncHandler(async (req, res) => {
    const {
        paymentIntentId,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        items,
        subtotal,
        tax,
        shippingCost,
        total,
        idempotencyKey
    } = req.body;

    if (!paymentIntentId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate payment using idempotency key
    if (idempotencyKey) {
        const existing = await checkIdempotency(idempotencyKey);
        if (existing && existing.status === 'completed') {
            logger.info(`Duplicate payment prevented: ${paymentIntentId}`);
            return res.status(200).json({
                success: true,
                orderId: existing.order_id,
                message: 'Order already processed',
                duplicate: true
            });
        }
    }

    // Check if order already exists for this payment intent
    const existingOrder = await pool.query(
        'SELECT id FROM orders WHERE stripe_payment_intent_id = $1',
        [paymentIntentId]
    );
    
    if (existingOrder.rows.length > 0) {
        logger.warn(`Duplicate order attempt: ${paymentIntentId}`);
        return res.status(409).json({
            error: 'Duplicate payment',
            message: 'This payment has already been processed',
            orderId: existingOrder.rows[0].id
        });
    }

    // Verify payment with Stripe if keys are available
    if (process.env.STRIPE_SECRET_KEY) {
        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (intent.status !== 'succeeded') {
                return res.status(402).json({
                    error: 'Payment not confirmed',
                    status: intent.status
                });
            }

            // Additional check: ensure amount matches
            const expectedAmount = Math.round(parseFloat(total) * 100);
            if (intent.amount !== expectedAmount) {
                logger.error(`Amount mismatch: expected ${expectedAmount}, got ${intent.amount}`);
                return res.status(400).json({
                    error: 'Amount mismatch',
                    message: 'Payment amount does not match order total'
                });
            }
        } catch (err) {
            logger.error('Stripe verification error:', err);
            return res.status(500).json({ error: 'Could not verify payment' });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create the retail order
        const orderResult = await client.query(
            `INSERT INTO orders 
             (customer_name, customer_email, customer_phone, customer_address, 
              total_amount, status, order_type, stripe_payment_intent_id)
             VALUES ($1, $2, $3, $4, $5, $6, 'retail', $7)
             RETURNING *`,
            [
                customer_name,
                customer_email,
                customer_phone || null,
                customer_address,
                total,
                'Paid',
                paymentIntentId
            ]
        );
        const order = orderResult.rows[0];

        // Create order items (enforce DB prices)
        for (const item of items) {
            const productRes = await client.query(
                'SELECT price, name FROM products WHERE id = $1',
                [item.productId]
            );
            const price = productRes.rows.length > 0
                ? productRes.rows[0].price
                : item.price;

            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, price]
            );
        }

        await client.query('COMMIT');

        // Save idempotency record as completed
        if (idempotencyKey) {
            await saveIdempotency(idempotencyKey, paymentIntentId, order.id, 'completed', {
                orderId: order.id,
                total,
                customer_email
            });
        }

        // Send confirmation email (non-blocking)
        sendOrderConfirmationEmail(order, items).catch(e =>
            logger.error('Confirmation email failed:', e)
        );

        logger.info(`Order created: ${order.id} for payment ${paymentIntentId}`);

        res.status(201).json({
            success: true,
            orderId: order.id,
            message: 'Order created successfully'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Order creation error:', { 
            error: err.message, 
            paymentIntentId,
            customer_email 
        });
        throw err;
    } finally {
        client.release();
    }
}));

module.exports = router;
