/**
 * Migration: Add deleted_at to retail_orders, wholesale_orders, catalogue, products
 * Run: node backend/migrations/add-soft-delete-extended.js
 *
 * Note: wholesale_orders is handled as a DO block in case the table doesn't exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`);
        console.log('✅ retail_orders.deleted_at');

        // wholesale_orders may not exist — skip gracefully
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wholesale_orders') THEN
                    ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
                    RAISE NOTICE 'wholesale_orders.deleted_at added';
                ELSE
                    RAISE NOTICE 'wholesale_orders table does not exist — skipped';
                END IF;
            END
            $$;
        `);
        console.log('✅ wholesale_orders check done');

        await client.query(`ALTER TABLE catalogue ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`);
        console.log('✅ catalogue.deleted_at');

        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`);
        console.log('✅ products.deleted_at');

        await client.query('COMMIT');
        console.log('\n✅ Migration complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
