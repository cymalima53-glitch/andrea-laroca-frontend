const { pool } = require('./db');

async function createRetailOrdersTable() {
    try {
        console.log('🚀 Creating retail_orders table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS retail_orders (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR(20) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50),
                shipping_address TEXT NOT NULL,
                shipping_city VARCHAR(100),
                shipping_state VARCHAR(50),
                shipping_zip VARCHAR(20),
                items JSONB NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) DEFAULT 'Processing',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ retail_orders table created!');

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_retail_orders_order_id ON retail_orders(order_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_retail_orders_status ON retail_orders(status);
        `);

        console.log('✅ Indexes created!');

        // Create trigger function
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_retail_orders_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_update_retail_orders_updated_at ON retail_orders;
        `);

        await pool.query(`
            CREATE TRIGGER trigger_update_retail_orders_updated_at
            BEFORE UPDATE ON retail_orders
            FOR EACH ROW
            EXECUTE FUNCTION update_retail_orders_updated_at();
        `);

        console.log('✅ Trigger created!');

        // Verify
        const result = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'retail_orders'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Table structure:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createRetailOrdersTable();
