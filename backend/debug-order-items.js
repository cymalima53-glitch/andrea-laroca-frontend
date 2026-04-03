const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkIds() {
    try {
        console.log('--- CHECKING ID OVERLAP ---');
        // Check if any catalogue item has an ID that exists in products
        const res = await pool.query(`
            SELECT c.id, c.name, p.name as product_match
            FROM catalogue c
            LEFT JOIN products p ON c.id = p.id
            LIMIT 10
        `);
        console.log('Catalogue vs Products IDs:', res.rows);

        // Check if we can differentiate orders by user role
        const usersRes = await pool.query(`
             SELECT id, username, role FROM users WHERE role = 'wholesale' LIMIT 5
        `);
        console.log('Wholesale Users:', usersRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkIds();
