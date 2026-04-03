const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Helper to generate next order ID
async function generateOrderId() {
    const result = await pool.query(
        'SELECT order_id FROM retail_orders ORDER BY id DESC LIMIT 1'
    );
    if (result.rows.length === 0) return 'RO-001';

    const lastOrderId = result.rows[0].order_id;
    const lastNumber = parseInt(lastOrderId.split('-')[1]);
    return `RO-${String(lastNumber + 1).padStart(3, '0')}`;
}

// GET /api/orders/retail
// SECURITY: Only admins can list all retail orders
router.get('/', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        console.log('🔍 [DEBUG] Fetching RETAIL orders...');

        // Stripe/paid orders are stored in the `orders` table with order_type='retail'
        const result = await pool.query(`
            SELECT 
                o.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'name', p.name,
                            'quantity', oi.quantity,
                            'price', oi.price_at_time
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.order_type = 'retail'
              AND (o.deleted_at IS NULL OR o.deleted_at IS NOT DISTINCT FROM NULL)
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);

        console.log('📋 [DEBUG] RETAIL ORDERS FOUND:', result.rows.length);
        res.json({ success: true, orders: result.rows });
    } catch (error) {
        console.error('Error fetching retail orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/retail/deleted — list soft-deleted retail orders
// MUST be before /:id to prevent Express matching 'deleted' as an :id param
// SECURITY: Only admins
router.get('/deleted', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM retail_orders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
        );
        res.json({ success: true, orders: result.rows });
    } catch (error) {
        console.error('Error fetching deleted retail orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch deleted orders' });
    }
});

// GET /api/orders/retail/:id
// SECURITY: Only admins can fetch individual retail orders
router.get('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM retail_orders WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        res.json({ success: true, order: result.rows[0] });
    } catch (error) {
        console.error('Error fetching retail order:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
});

// POST /api/orders/retail
router.post('/', async (req, res) => {
    try {
        const {
            customer_name, customer_email, customer_phone,
            shipping_address, shipping_city, shipping_state, shipping_zip,
            items, total
        } = req.body;

        if (!customer_name || !customer_email || !shipping_address || !items || !total) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const order_id = await generateOrderId();

        const result = await pool.query(
            `INSERT INTO retail_orders (
                order_id, customer_name, customer_email, customer_phone,
                shipping_address, shipping_city, shipping_state, shipping_zip,
                items, total, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                order_id, customer_name, customer_email, customer_phone || null,
                shipping_address, shipping_city || null, shipping_state || null, shipping_zip || null,
                JSON.stringify(items), total, 'Processing'
            ]
        );

        res.status(201).json({ success: true, order: result.rows[0], message: 'Order created successfully' });
    } catch (error) {
        console.error('Error creating retail order:', error);
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
});

// PATCH /api/orders/retail/:id
// SECURITY: Only admins can update retail order status
router.patch('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            'UPDATE retail_orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        res.json({ success: true, order: result.rows[0], message: 'Status updated' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, error: 'Failed to update' });
    }
});



// DELETE /api/orders/retail/:id — SOFT DELETE (sets deleted_at)
// SECURITY: Only admins can delete retail orders
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE retail_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found or already deleted' });
        }
        res.json({ success: true, message: 'Order removed' });
    } catch (error) {
        console.error('Error soft-deleting retail order:', error);
        res.status(500).json({ success: false, error: 'Failed to remove' });
    }
});

// PATCH /api/orders/retail/:id/restore — restore a soft-deleted retail order
// SECURITY: Only admins
router.patch('/:id/restore', verifyToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE retail_orders SET deleted_at = NULL WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        res.json({ success: true, message: 'Order restored' });
    } catch (error) {
        console.error('Error restoring retail order:', error);
        res.status(500).json({ success: false, error: 'Failed to restore' });
    }
});

module.exports = router;
