const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../db');

async function migrate() {
    try {
        console.log('Running migration: add_user_fields...');
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type VARCHAR(50)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS inquiry_type VARCHAR(50)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contacted_salesperson VARCHAR(10)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS message TEXT`);
        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
