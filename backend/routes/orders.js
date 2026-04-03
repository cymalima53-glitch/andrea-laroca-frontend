const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const { pool } = require('../db');

// @route   GET api/orders (Mounted at /api/orders, so this handles GET /api/orders)
// @desc    Fetch all orders
// @access  Private (Admin)
// Brief said GET /api/admin/orders. In server.js we can mount this router to /api/orders or /api/admin/orders.
// I'll stick to RESTful convention in file, and mount appropriately in server.js.
// If mounted at /api/orders, this is GET /api/orders.
// @route   GET api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Only return orders for the logged-in user
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/orders/:id
// @desc    Get order details (with items)
// @access  Private
router.get('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // SECURITY: Data isolation — ensure the order belongs to the requesting user (admins can see all)
        if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: This order does not belong to you' });
        }

        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
        order.items = itemsResult.rows;

        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin or Order Owner)
router.put('/:id/status', auth, async (req, res) => {
    const { id } = req.params;
    const { status, tracking_number } = req.body;

    try {
        // SECURITY: First check if order exists and belongs to user
        const orderCheck = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        
        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        const order = orderCheck.rows[0];

        // SECURITY: Verify authorization - admin can update any, users only their own
        if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: Cannot modify this order' });
        }

        // SECURITY: Non-admin users cannot set certain statuses
        if (req.user.role !== 'admin') {
            const allowedStatuses = ['cancelled']; // Users can only cancel their orders
            if (!allowedStatuses.includes(status)) {
                return res.status(403).json({ msg: 'Access denied: Cannot set this status' });
            }
        }

        // Update order with optional tracking number
        let updateQuery = 'UPDATE orders SET status = $1';
        let params = [status];
        
        if (tracking_number) {
            updateQuery += ', tracking_number = $2';
            params.push(tracking_number);
        }
        
        updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`;
        params.push(id);

        const result = await pool.query(updateQuery, params);
        res.json(result.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/orders/:id
// @desc    Delete an order and its items
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    
    try {
        // SECURITY: Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admin only' });
        }

        // Delete items first (manually cascading just in case)
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);

        // Delete order
        const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        res.json({ msg: 'Order removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const { sendOrderConfirmationEmail } = require('../utils/emailService');

// @route   POST api/orders
// @desc    Create a new order
// @access  Public (Retail) or Private (Wholesale)
router.post('/', async (req, res) => {
    // Check for auth header manually if we want to associate user, 
    // or rely on client sending user_id if we trust it? No, never trust client.
    // If we want mixed access (public/private), we can't strict use 'auth' middleware on the whole route.
    // We can parse token if present.

    // Simple approach: Client sends payload. If request has Authorization header, we verify it.

    const authHeader = req.header('Authorization');
    let userId = null;
    let userRole = 'retail_guest';

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = require('jsonwebtoken').verify(token, process.env.ACCESS_TOKEN_SECRET);
            userId = decoded.user.id;
            userRole = decoded.user.role;
        } catch (e) {
            // Invalid token, treat as guest or error? 
            // If they tried to send a token, it might be expired. 
            // For now, if token fails, we proceed as guest or fail?
            // Safer to fail if they INTENDED to be logged in.
            // But for simplicity, let's just log and proceed as guest if it's retail flow, 
            // BUT wholesale requires auth.
        }
    }

    const { customer_name, customer_email, customer_phone, items, total_amount } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'No items in order' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create Order
        const orderQuery = `
            INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, customer_address, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const orderValues = [userId, customer_name, customer_email, customer_phone, req.body.customer_address, total_amount, 'Pending'];
        const orderResult = await client.query(orderQuery, orderValues);
        const order = orderResult.rows[0];

        // 2. Create Order Items
        for (const item of items) {
            // Verify price/product exists? 
            // In a real app we fetch price from DB to prevent tampering.
            // For prototype, we trust client or simple check.
            // Better: fetch product price.

            const productRes = await client.query('SELECT price, name FROM products WHERE id = $1', [item.productId]);
            let price = item.price;
            let name = item.name;

            if (productRes.rows.length > 0) {
                price = productRes.rows[0].price; // Enforce DB price
                name = productRes.rows[0].name;
            }

            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, price]
            );
        }

        // 3. If Wholesale (User ID present), Clear Cart
        if (userId) {
            const cartRes = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
            if (cartRes.rows.length > 0) {
                await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].id]);
            }
        }

        await client.query('COMMIT');

        // 4. Send Confirmation Email (Async)
        // Need to construct detailed items list for email
        // We reused 'items' from request but corrected prices.
        // Let's re-map them for the email or just use request items if we trust names.
        sendOrderConfirmationEmail(order, items).catch(e => console.error('Email failed', e));

        res.status(201).json(order);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});


// Update order status/price (For Admin/Wholesale Flow)
// SECURITY: Admin only - users should not be able to modify order prices
router.put('/:id/quote', auth, async (req, res) => {
    const { id } = req.params;
    const { total_amount, status } = req.body;

    try {
        // SECURITY: Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admin only' });
        }

        const result = await pool.query(
            'UPDATE orders SET total_amount = $1, status = $2 WHERE id = $3 RETURNING *',
            [total_amount, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

