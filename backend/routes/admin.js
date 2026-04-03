const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');

// Middleware to ensure admin
router.use(verifyToken, requireRole(['admin']));

// @route   GET api/admin/users/pending
// @desc    Get all pending users
// @access  Admin
router.get('/users/pending', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, company_name, created_at FROM users WHERE role = $1 AND approval_status = $2 ORDER BY created_at DESC',
            ['wholesale', 'pending']
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT api/admin/users/approve/:id
// @desc    Approve a user
// @access  Admin
router.put('/users/approve/:id', async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id; // From token

    try {
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const user = userResult.rows[0];

        if (user.approval_status === 'approved') {
            return res.status(400).json({ msg: 'User already approved' });
        }

        // Update User
        const updateQuery = `
            UPDATE users 
            SET approval_status = 'approved', approved_at = NOW(), approved_by_id = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const updateResult = await pool.query(updateQuery, [adminId, id]);
        const updatedUser = updateResult.rows[0];

        // Send Email
        sendApprovalEmail(updatedUser).catch(err => console.error('Error sending approval email:', err));

        res.json({ msg: 'User approved', user: updatedUser });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT api/admin/users/reject/:id
// @desc    Reject a user
// @access  Admin
router.put('/users/reject/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const user = userResult.rows[0];

        // Update User
        const updateQuery = `
            UPDATE users 
            SET approval_status = 'rejected', refresh_token = NULL 
            WHERE id = $1 
            RETURNING *
        `;
        const updateResult = await pool.query(updateQuery, [id]);
        const updatedUser = updateResult.rows[0];

        // Send Email
        sendRejectionEmail(updatedUser).catch(err => console.error('Error sending rejection email:', err));

        res.json({ msg: 'User rejected', user: updatedUser });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET api/admin/dashboard-stats
// @desc    Aggregated metrics for the admin dashboard
// @access  Admin
router.get('/dashboard-stats', async (req, res) => {
    // Each block is independent — a schema issue in one table won't crash the whole endpoint
    let wsTotal = 0, wsPending = 0, wsRevenue = 0, wsRecent = [];
    let rtTotal = 0, rtPending = 0, rtRevenue = 0, rtRecent = [];

    try {
        // ── Wholesale (orders table) ──────────────────────────────────────
        try {
            const r = await pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE deleted_at IS NULL)                                                    AS total,
                    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Pending Pricing')                     AS pending,
                    COALESCE(SUM(CAST(NULLIF(total_amount::text,'') AS NUMERIC)) FILTER (
                        WHERE deleted_at IS NULL AND status = 'Completed'), 0)                                    AS revenue
                 FROM orders`
            );
            wsTotal = parseInt(r.rows[0].total) || 0;
            wsPending = parseInt(r.rows[0].pending) || 0;
            wsRevenue = parseFloat(r.rows[0].revenue) || 0;
        } catch (e) {
            console.error('❌ dashboard-stats: orders query failed:', e.message);
        }

        try {
            const r = await pool.query(
                `SELECT id::text AS id, customer_name, customer_email,
                        total_amount::text AS total, status, created_at,
                        'wholesale' AS order_type
                 FROM orders
                 WHERE deleted_at IS NULL
                 ORDER BY created_at DESC LIMIT 5`
            );
            wsRecent = r.rows;
        } catch (e) {
            console.error('❌ dashboard-stats: orders recent query failed:', e.message);
        }

        // ── Retail (retail_orders table) ──────────────────────────────────
        try {
            const r = await pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE deleted_at IS NULL)                                                    AS total,
                    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('Processing','Pending'))             AS pending,
                    COALESCE(SUM(CAST(NULLIF(total,'') AS NUMERIC)) FILTER (
                        WHERE deleted_at IS NULL AND status IN ('Shipped','Completed')), 0)                       AS revenue
                 FROM retail_orders`
            );
            rtTotal = parseInt(r.rows[0].total) || 0;
            rtPending = parseInt(r.rows[0].pending) || 0;
            rtRevenue = parseFloat(r.rows[0].revenue) || 0;
        } catch (e) {
            console.error('❌ dashboard-stats: retail_orders query failed:', e.message);
        }

        try {
            const r = await pool.query(
                `SELECT id::text AS id, customer_name, customer_email,
                        total::text AS total, status, created_at,
                        'retail' AS order_type
                 FROM retail_orders
                 WHERE deleted_at IS NULL
                 ORDER BY created_at DESC LIMIT 5`
            );
            rtRecent = r.rows;
        } catch (e) {
            console.error('❌ dashboard-stats: retail_orders recent query failed:', e.message);
        }

        // ── Merge & respond ───────────────────────────────────────────────
        const recentOrders = [...wsRecent, ...rtRecent]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);

        res.json({
            totalOrders: wsTotal + rtTotal,
            pendingOrders: wsPending + rtPending,
            totalRevenue: wsRevenue + rtRevenue,
            recentOrders,
        });

    } catch (err) {
        console.error('❌ dashboard-stats: unexpected error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// @route   GET api/admin/orders
// @desc    Get all orders (Admin)
// @access  Admin
router.get('/orders', async (req, res) => {
    const { type } = req.query; // 'wholesale' or 'retail'

    try {
        let query = `
            SELECT o.*, 
                   COALESCE(
                      json_agg(
                          json_build_object(
                              'product_id', p.id,
                              'name', p.name, 
                              'quantity', oi.quantity,
                              'price', oi.price_at_time
                          )
                      ) FILTER (WHERE oi.id IS NOT NULL), 
                      '[]'
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id 
        `;

        const values = [];
        if (type) {
            query += ` WHERE o.order_type = $1 `;
            values.push(type);
        }

        query += `
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT api/admin/orders/:id/price
// @desc    Update order total amount
// @access  Admin
router.put('/orders/:id/price', async (req, res) => {
    const { id } = req.params;
    const { total_amount } = req.body;

    try {
        const result = await pool.query(
            'UPDATE orders SET total_amount = $1, status = $2 WHERE id = $3 RETURNING *',
            [total_amount, 'Awaiting Payment', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST api/admin/orders/:id/invoice
// @desc    Send invoice email
// @access  Admin
router.post('/orders/:id/invoice', async (req, res) => {
    const { id } = req.params;

    try {
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) return res.status(404).json({ msg: 'Order not found' });

        const order = orderResult.rows[0];
        const itemsResult = await pool.query('SELECT * FROM order_items JOIN products ON order_items.product_id = products.id WHERE order_id = $1', [id]);

        // Send Invoice Email
        const { sendInvoiceEmail } = require('../utils/emailService');
        await sendInvoiceEmail(order, itemsResult.rows);

        res.json({ msg: 'Invoice sent successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
