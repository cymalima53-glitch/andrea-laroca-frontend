/**
 * Migration: Add variants JSONB + nutrition_image_url to products & catalogue tables
 * Run: node backend/migrations/add_variants.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
});

async function runMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Adding variants + nutrition_image_url to products table...');
        await client.query(`
            ALTER TABLE products
                ADD COLUMN IF NOT EXISTS nutrition_image_url TEXT,
                ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('🔄 Adding variants + nutrition_image_url to catalogue table...');
        await client.query(`
            ALTER TABLE catalogue
                ADD COLUMN IF NOT EXISTS nutrition_image_url TEXT,
                ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration complete — variants system columns added.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
