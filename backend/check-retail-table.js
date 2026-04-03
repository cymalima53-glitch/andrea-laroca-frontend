const { pool } = require('./db');

async function checkAndCreateTable() {
    try {
        // Check if table exists
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'retail_orders'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('✅ retail_orders table already exists!');

            // Show structure
            const structure = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'retail_orders'
                ORDER BY ordinal_position;
            `);

            console.log('\n📋 Table structure:');
            structure.rows.forEach(row => {
                console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
            });
        } else {
            console.log('❌ Table does not exist. Creating...');

            await pool.query(`
                CREATE TABLE retail_orders (
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

            console.log('✅ Table created successfully!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAndCreateTable();
