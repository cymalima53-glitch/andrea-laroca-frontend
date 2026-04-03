const pool = require('./db');

async function run() {
    try {
        console.log('Restoring "cama" product...');

        // Check if exists first (case insensitive)
        const check = await pool.query("SELECT * FROM products WHERE name ILIKE '%cama%'");
        if (check.rows.length > 0) {
            console.log('Product "cama" already exists:', check.rows[0]);
            // Maybe update it to have valid price/image?
            const id = check.rows[0].id;
            await pool.query("UPDATE products SET price = 12.99, image_url = '/coffee-bag-placeholder.png' WHERE id = $1", [id]);
            console.log('Updated "cama" to ensure valid data.');
        } else {
            const res = await pool.query(`
                INSERT INTO products (name, description, price, category, sku, unit, image_url, in_stock)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, ['Cama Special Blend', 'Premium seasonal blend.', 14.50, 'COFFEE', 'CAMA-001', 'Kg', '/placeholder.jpg', true]);
            console.log('Created "Cama Special Blend" successfully:', res.rows[0]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        // Access the underlying pool object to close connection
        if (pool.pool) await pool.pool.end();
    }
}

run();
