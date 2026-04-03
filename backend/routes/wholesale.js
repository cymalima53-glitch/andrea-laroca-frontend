const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// POST /api/wholesale/orders
// SECURITY: Requires authentication. userId is taken from the verified token, not from client body.
router.post('/orders', verifyToken, async (req, res) => {
    const { customerName, customerEmail, items } = req.body;
    const userId = req.user.id; // SECURITY: Always use server-verified identity

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
    }

    try {
        await pool.query('BEGIN');

        // Create Order
        const orderResult = await pool.query(
            `INSERT INTO orders 
            (user_id, customer_name, customer_email, total_amount, status) 
            VALUES ($1, $2, $3, 0.00, 'Pending Pricing') 
            RETURNING id`,
            [userId, customerName, customerEmail]
        );
        const orderId = orderResult.rows[0].id;

        // Create Order Items
        for (const item of items) {
            await pool.query(
                `INSERT INTO order_items (order_id, catalogue_id, quantity, price_at_time)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.product_id, item.quantity, 0]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json({ message: 'Wholesale order created', orderId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error creating wholesale order:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/wholesale/orders - List all wholesale orders for admin
// SECURITY: Requires admin role
router.get('/orders', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        console.log('🔍 [DEBUG] Fetching WHOLESALE orders...');

        // Try precise query first - STRICTER FILTERING
        // Exclude 'retail' type explicitly if it exists
        const query = `
            SELECT * FROM orders 
            WHERE (status IN ('Pending Pricing', 'Awaiting Payment', 'Pending Payment', 'Completed') OR order_type = 'wholesale')
            AND (order_type IS DISTINCT FROM 'retail')
            AND deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        console.log('Running Query:', query);

        const result = await pool.query(query);
        console.log('📋 [DEBUG] WHOLESALE ORDERS FOUND:', result.rows.length);

        // Log details to debug why retail orders might appear
        if (result.rows.length > 0) {
            console.log('--- ORDER INSPECTION ---');
            result.rows.forEach(o => {
                console.log(`ID: ${o.id} | Type: ${o.order_type} | Status: ${o.status} | Total: ${o.total_amount}`);
            });
            console.log('------------------------');
        }

        res.json(result.rows);
    } catch (err) {
        console.error('❌ [DEBUG] Primary wholesale query failed:', err.message);
        console.log('Falling back to status-only query...');

        try {
            const fallbackQuery = `
                SELECT * FROM orders 
                WHERE status IN ('Pending Pricing', 'Awaiting Payment', 'Pending Payment', 'Completed')
                AND deleted_at IS NULL
                ORDER BY created_at DESC
            `;
            const fallback = await pool.query(fallbackQuery);
            console.log('📋 [DEBUG] FALLBACK WHOLESALE ORDERS FOUND:', fallback.rows.length);
            res.json(fallback.rows);
        } catch (e) {
            console.error('❌ [DEBUG] Fallback query failed:', e);
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// GET /api/wholesale/orders/deleted — list soft-deleted wholesale orders
// SECURITY: Requires admin role
router.get('/orders/deleted', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM orders
             WHERE deleted_at IS NOT NULL
             AND (order_type IS DISTINCT FROM 'retail')
             ORDER BY deleted_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching deleted wholesale orders:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/wholesale/orders/:id — SOFT DELETE (sets deleted_at)
// SECURITY: Requires admin role
router.delete('/orders/:id', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Order ID required' });

        const result = await pool.query(
            'UPDATE orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or already deleted' });
        }

        res.json({ success: true, message: 'Order removed' });
    } catch (error) {
        console.error('Error soft-deleting wholesale order:', error);
        res.status(500).json({ error: 'Failed to remove' });
    }
});

// PATCH /api/wholesale/orders/:id/restore — restore a soft-deleted wholesale order
// SECURITY: Requires admin role
router.patch('/orders/:id/restore', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE orders SET deleted_at = NULL WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, message: 'Order restored' });
    } catch (error) {
        console.error('Error restoring wholesale order:', error);
        res.status(500).json({ error: 'Failed to restore' });
    }
});

module.exports = router;
