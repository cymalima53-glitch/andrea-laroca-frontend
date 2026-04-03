const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Adding order_type column...');
        await pool.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'wholesale';
        `);
        console.log('Column added successfully.');

        // Update existing orders to 'wholesale' just in case default didn't catch pre-existing rows (it should, but good to be sure)
        await pool.query(`UPDATE orders SET order_type = 'wholesale' WHERE order_type IS NULL`);
        console.log('Existing orders updated to wholesale.');

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

migrate();
