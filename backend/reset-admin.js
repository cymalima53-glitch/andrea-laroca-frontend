const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const NEW_EMAIL = 'admin@larocca.com';
const NEW_PASSWORD = '123456';
const NEW_USERNAME = 'Admin';

// Supports both DATABASE_URL (Neon) and individual vars (local)
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

async function resetAdmin() {
    try {
        const dbType = process.env.DATABASE_URL ? 'Neon' : 'Local';
        console.log(`🔌 Connecting to ${dbType} database...`);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(NEW_PASSWORD, salt);

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [NEW_EMAIL]);

        if (userCheck.rows.length > 0) {
            console.log(`🔄 Updating existing user: ${NEW_EMAIL}`);
            await pool.query(
                'UPDATE users SET username = $1, password_hash = $2, role = $3, approval_status = $4 WHERE email = $5',
                [NEW_USERNAME, passwordHash, 'admin', 'approved', NEW_EMAIL]
            );
            console.log('✅ Admin password reset successfully!');
        } else {
            console.log(`🆕 Creating new admin: ${NEW_EMAIL}`);
            await pool.query(
                'INSERT INTO users (username, email, password_hash, role, approval_status) VALUES ($1, $2, $3, $4, $5)',
                [NEW_USERNAME, NEW_EMAIL, passwordHash, 'admin', 'approved']
            );
            console.log('✅ New admin user created!');
        }

        // Confirm
        const confirm = await pool.query('SELECT id, email, role, approval_status FROM users WHERE email = $1', [NEW_EMAIL]);
        console.log('\n📋 Admin user on DB:');
        console.log('   ID:', confirm.rows[0].id);
        console.log('   Email:', confirm.rows[0].email);
        console.log('   Role:', confirm.rows[0].role);
        console.log('   Status:', confirm.rows[0].approval_status);
        console.log('\n🔑 Login with:');
        console.log('   Email:', NEW_EMAIL);
        console.log('   Password:', NEW_PASSWORD);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

resetAdmin();
