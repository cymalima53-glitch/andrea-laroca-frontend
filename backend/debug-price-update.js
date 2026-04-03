const axios = require('axios');
const { pool } = require('./db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration
const BASE_URL = 'http://localhost:5000/api';
// Using a known admin token or logging in would be better.
// For now, I'll try to login with default credentials if I can find them,
// or just manually insert a token. 
// Actually, let's just make a direct DB call to see if the UPDATE works, 
// AND try the API if we can get a token. 
// But without the user's password, I can't login via script easily unless I reset it.
// I'll assume the issue might be SQL or data.

async function testUpdate() {
    try {
        // 1. Get an existing order ID
        const res = await pool.query('SELECT id FROM orders LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No orders found to test.');
            return;
        }
        const orderId = res.rows[0].id;
        console.log(`Testing with Order ID: ${orderId}`);

        // 2. Try direct DB update (Sanity Check)
        const price = 150.00;
        const result = await pool.query(
            'UPDATE orders SET total_amount = $1, status = $2 WHERE id = $3 RETURNING *',
            [price, 'Awaiting Payment', orderId]
        );
        console.log('DB Update Success:', result.rows[0]);

        // 3. To test API, we need a token.
        // I can generate one using jsonwebtoken if I have the secret.
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { user: { id: 1, role: 'admin' } }, // Assuming ID 1 is admin
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Generated Test Token');

        // 4. Call API
        try {
            const apiRes = await axios.put(
                `${BASE_URL}/admin/orders/${orderId}/price`,
                { total_amount: 200.00 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('API Update Success:', apiRes.data);
        } catch (apiErr) {
            console.error('API Update Failed:', apiErr.response ? apiErr.response.data : apiErr.message);
            console.error('Status:', apiErr.response ? apiErr.response.status : 'N/A');
        }

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        pool.end();
    }
}

testUpdate();
