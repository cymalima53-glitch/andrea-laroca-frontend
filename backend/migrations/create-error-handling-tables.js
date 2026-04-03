const { pool } = require('../db');

async function createTables() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Error logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id SERIAL PRIMARY KEY,
                error_id UUID NOT NULL,
                message TEXT NOT NULL,
                stack TEXT,
                path VARCHAR(255),
                method VARCHAR(10),
                user_id INTEGER,
                severity VARCHAR(20) DEFAULT 'error',
                resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMP,
                resolved_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Webhook events queue
        await client.query(`
            CREATE TABLE IF NOT EXISTS webhook_queue (
                id SERIAL PRIMARY KEY,
                event_id VARCHAR(255) UNIQUE NOT NULL,
                provider VARCHAR(50) NOT NULL, -- 'stripe', 'shippo', etc.
                event_type VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                last_error TEXT,
                processed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Payment idempotency tracking
        await client.query(`
            CREATE TABLE IF NOT EXISTS payment_idempotency (
                id SERIAL PRIMARY KEY,
                idempotency_key VARCHAR(255) UNIQUE NOT NULL,
                payment_intent_id VARCHAR(255),
                order_id INTEGER,
                status VARCHAR(50) NOT NULL,
                response JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
            )
        `);

        // Indexes for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
            CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
            CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
            CREATE INDEX IF NOT EXISTS idx_webhook_queue_event ON webhook_queue(event_id);
            CREATE INDEX IF NOT EXISTS idx_payment_idempotency_key ON payment_idempotency(idempotency_key);
        `);

        await client.query('COMMIT');
        console.log('✅ Error handling tables created successfully');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    createTables()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createTables;
