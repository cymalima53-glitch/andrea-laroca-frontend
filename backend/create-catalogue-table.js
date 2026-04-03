const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS catalogue (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price VARCHAR(50),
        category VARCHAR(100),
        sku VARCHAR(100),
        unit VARCHAR(50),
        image_url VARCHAR(255),
        in_stock BOOLEAN DEFAULT TRUE
    );
`;

(async () => {
    try {
        await pool.query(createTableQuery);
        console.log("Catalogue table created successfully.");
    } catch (err) {
        console.error("Error creating catalogue table:", err);
    } finally {
        pool.end();
    }
})();
