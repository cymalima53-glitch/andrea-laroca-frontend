const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', res.rows.map(r => r.table_name));

        // If retail_products exists, show its columns
        const retailRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'retail_products'
        `);
        if (retailRes.rows.length > 0) {
            console.log('Retail Products Columns:', retailRes.rows.map(r => r.column_name));
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
