const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

async function initDB() {
    // 1. Connect to 'postgres' database to create 'larocca' database if it doesn't exist
    const rootConfig = { ...dbConfig, database: 'postgres' };
    const rootPool = new Pool(rootConfig);

    try {
        console.log('Connecting to postgres database...');
        const client = await rootPool.connect();

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbConfig.database}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${dbConfig.database} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbConfig.database}"`);
            console.log(`Database ${dbConfig.database} created.`);
        } else {
            console.log(`Database ${dbConfig.database} already exists.`);
        }
        client.release();
    } catch (err) {
        console.error('Error checking/creating database:', err.message);
        if (err.code === '28P01') {
            console.error('\n*** AUTHENTICATION FAILED ***');
            console.error('Please check your .env file and ensure DB_PASSWORD is correct.\n');
        }
        process.exit(1);
    } finally {
        await rootPool.end();
    }

    // 2. Connect to the actual database
    const pool = new Pool(dbConfig);

    try {
        console.log(`Connecting to ${dbConfig.database}...`);

        // Read SQL files
        const schemaSql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        const seedSql = fs.readFileSync(path.join(__dirname, 'seed-products.sql'), 'utf8');

        // Run Schema
        console.log('Running schema setup...');
        await pool.query(schemaSql);

        // Run Seeds
        console.log('Running product seeds...');
        // Clear existing products to avoid duplicates? 
        // For now, let's just run the insert.
        // Simple regex to check if seed has content
        if (seedSql.trim().length > 0) {
            await pool.query('DELETE FROM products'); // Clean slate for seeds
            await pool.query(seedSql);
        }

        // Create Default Admin User
        console.log('Checking for admin user...');
        const userRes = await pool.query("SELECT * FROM users WHERE email = 'admin@larocca.com'");
        if (userRes.rows.length === 0) {
            console.log('Creating default admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
                ['admin', 'admin@larocca.com', hashedPassword]
            );
            console.log('Admin user created: admin@larocca.com / admin123');
        } else {
            console.log('Admin user already exists.');
        }

        console.log('\n*** DATABASE SETUP COMPLETE ***\n');

    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await pool.end();
    }
}

initDB();
