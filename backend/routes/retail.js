const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { sendOrderConfirmationEmail } = require('../utils/emailService');

// @route   GET api/retail/products
// @desc    Get all retail products
// @access  Public
router.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE in_stock = TRUE ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/retail/orders
// @desc    Create a new retail order
// @access  Public
router.post('/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, customer_address, items, total_amount } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'No items in order' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create Order (Retail Type)
        const orderQuery = `
            INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total_amount, status, order_type)
            VALUES ($1, $2, $3, $4, $5, $6, 'retail')
            RETURNING *
        `;
        const orderValues = [customer_name, customer_email, customer_phone, customer_address, total_amount, 'Pending Payment'];
        const orderResult = await client.query(orderQuery, orderValues);
        const order = orderResult.rows[0];

        // 2. Create Order Items
        for (const item of items) {
            // Verify price from DB (products table)
            const productRes = await client.query('SELECT price, name FROM products WHERE id = $1', [item.productId]);
            let price = item.price;

            if (productRes.rows.length > 0) {
                price = productRes.rows[0].price; // Enforce DB price
            }

            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, price]
            );
        }

        await client.query('COMMIT');

        // 3. Send Confirmation Email (Async)
        // Ensure email service can handle this or add fail-safe
        if (sendOrderConfirmationEmail) {
            sendOrderConfirmationEmail(order, items).catch(e => console.error('Email failed', e));
        }

        res.status(201).json(order);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;
