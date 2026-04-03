const express = require('express');
const router = express.Router();
const pool = require('../db');

// Test endpoint to create retail_orders table
router.post('/setup-retail-orders', async (req, res) => {
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

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_retail_orders_order_id ON retail_orders(order_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_retail_orders_status ON retail_orders(status);
        `);

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

        res.json({ success: true, message: 'retail_orders table created successfully!' });
    } catch (error) {
        console.error('Error creating table:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/setup/add-catalogue-column
router.post('/add-catalogue-column', async (req, res) => {
    try {
        console.log('🛠️ Adding catalogue_id column to order_items...');

        // Add column and make product_id nullable (since wholesale items won't have product_id)
        await pool.query(`
            ALTER TABLE order_items 
            ADD COLUMN IF NOT EXISTS catalogue_id INTEGER;
            
            ALTER TABLE order_items 
            ALTER COLUMN product_id DROP NOT NULL;
        `);

        console.log('✅ Column added successfully!');
        res.json({ success: true, message: 'catalogue_id column added successfully!' });
    } catch (error) {
        console.error('❌ Error adding column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
