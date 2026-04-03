const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./db');

async function updateSchema() {
    try {
        console.log('Starting schema update...');
        console.log('DB Connection Info:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            db: process.env.DB_NAME,
            hasPassword: !!process.env.DB_PASSWORD
        });

        const client = await pool.connect();
        console.log('Database connected successfully.');

        const queries = [
            'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address VARCHAR(255);',
            'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);',
            'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);'
        ];

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        console.log('All schema updates completed successfully.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
