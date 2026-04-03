const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkUsers() {
    try {
        const res = await pool.query("SELECT id, username, email, role, approval_status FROM users ORDER BY created_at DESC LIMIT 5");
        res.rows.forEach(u => {
            console.log(`User: ${u.username} | Role: ${u.role} | Status: ${u.approval_status}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUsers();
