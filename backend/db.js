const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Support both DATABASE_URL (Neon/production) and individual vars (local dev)
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Neon
    })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    });

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
