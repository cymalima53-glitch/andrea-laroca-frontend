const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function resetAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@larocca.com'", [hash]);
        console.log('✅ Admin password reset to: admin123');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

resetAdmin();
