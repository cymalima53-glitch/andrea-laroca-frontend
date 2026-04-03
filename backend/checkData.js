const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkData() {
    try {
        console.log('--- Recent Users ---');
        const resUsers = await pool.query("SELECT id, username, email, role, approval_status, created_at FROM users ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(resUsers.rows, null, 2));

        console.log('\n--- Checking Orders Table ---');
        const resTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = resTables.rows.map(r => r.table_name);
        console.log('Tables:', tables);
        console.log('Orders table exists:', tables.includes('orders'));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkData();
