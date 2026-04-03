const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkAdmin() {
    try {
        const res = await pool.query("SELECT id, username, email, role, password_hash FROM users WHERE email = 'admin@larocca.com'");
        console.log('Admin User:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkAdmin();
