/**
 * Migration: Add deleted_at column to orders and retail_orders tables
 * Run once: node backend/migrations/add-soft-delete.js
 */
const { pool } = require('../db');

async function migrate() {
    try {
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
        console.log('✅ Added deleted_at to orders table');

        await pool.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
        console.log('✅ Added deleted_at to retail_orders table');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
