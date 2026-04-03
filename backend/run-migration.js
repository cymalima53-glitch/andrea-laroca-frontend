const { pool } = require('./db');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');
        await client.query('BEGIN');

        // Alter Users Table
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'retail_guest',
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS company_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS refresh_token TEXT,
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS approved_by_id INTEGER;
        `);
        console.log('Users table updated.');

        // Alter Orders Table
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
        `);
        console.log('Orders table updated.');

        // Create Carts Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS carts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Carts table created/verified.');

        // Create Cart Items Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER DEFAULT 1,
                UNIQUE(cart_id, product_id)
            );
        `);
        console.log('Cart Items table created/verified.');

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end(); // Close the pool to exit the script
    }
}

runMigration();
