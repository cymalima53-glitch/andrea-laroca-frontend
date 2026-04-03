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

const recreateTableQuery = `
    DROP TABLE IF EXISTS catalogue;
    CREATE TABLE catalogue (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price VARCHAR(100), -- Changed to VARCHAR to allow "Request Quote" or units
        image_url VARCHAR(255),
        sku VARCHAR(100), -- Keeping SKU for admin reference if needed, optional
        unit VARCHAR(50), -- Keeping Unit
        in_stock BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
`;

(async () => {
    try {
        await pool.query(recreateTableQuery);
        console.log("Catalogue table RECREATED successfully with refined schema.");
    } catch (err) {
        console.error("Error recreating catalogue table:", err);
    } finally {
        pool.end();
    }
})();
