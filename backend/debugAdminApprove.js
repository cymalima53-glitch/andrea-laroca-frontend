const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function simulateApproval() {
    try {
        // 1. Get Admin ID
        const adminRes = await pool.query("SELECT * FROM users WHERE email = 'admin@larocca.com'");
        if (adminRes.rows.length === 0) throw new Error("Admin not found");
        const admin = adminRes.rows[0];
        console.log('Admin found:', admin.id);

        // 2. Mock Token Verification
        const token = jwt.sign({ user: { id: admin.id, role: admin.role } }, process.env.ACCESS_TOKEN_SECRET);
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('Token Decoded:', decoded);
        const adminId = decoded.user.id;

        // 3. Find a pending user
        const pendingRes = await pool.query("SELECT * FROM users WHERE approval_status = 'pending' LIMIT 1");
        if (pendingRes.rows.length === 0) {
            console.log('No pending users to approve.');
            // Create one for testing
            const insertRes = await pool.query(`
            INSERT INTO users (username, email, password_hash, role, approval_status, company_name)
            VALUES ('Test Pending', 'pending@test.com', 'hash', 'wholesale', 'pending', 'Test Co')
            RETURNING *
        `);
            console.log('Created test pending user:', insertRes.rows[0].id);
            var pendingUser = insertRes.rows[0];
        } else {
            var pendingUser = pendingRes.rows[0];
            console.log('Found pending user:', pendingUser.id);
        }

        // 4. Simulate Approval Query
        const updateQuery = `
        UPDATE users 
        SET approval_status = 'approved', approved_at = NOW(), approved_by_id = $1 
        WHERE id = $2 
        RETURNING *
    `;
        console.log('Running update query...');
        const updateResult = await pool.query(updateQuery, [adminId, pendingUser.id]);
        console.log('Update success:', updateResult.rows[0]);

    } catch (err) {
        console.error('SIMULATION ERROR:', err);
    } finally {
        pool.end();
    }
}

simulateApproval();
