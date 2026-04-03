/**
 * Migration: Add stripe_payment_intent_id to orders table
 * Run once: node backend/migrations/add-stripe-column.js
 */
const { pool } = require('../db');

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)
        `);
        console.log('✅ Added stripe_payment_intent_id column to orders table');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
