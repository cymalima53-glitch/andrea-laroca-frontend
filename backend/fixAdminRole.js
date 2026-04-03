const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixRole() {
    try {
        const res = await pool.query("UPDATE users SET role = 'admin' WHERE email = 'admin@larocca.com' RETURNING *");
        console.log('Fixed Admin Role:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

fixRole();
