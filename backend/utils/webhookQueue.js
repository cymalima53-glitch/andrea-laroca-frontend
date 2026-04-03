const { pool } = require('../db');
const logger = require('./logger');

/**
 * Webhook Queue Processor
 * Handles retries with exponential backoff
 */
class WebhookQueue {
    constructor() {
        this.processing = false;
        this.retryDelays = [5000, 15000, 45000]; // 5s, 15s, 45s
    }

    /**
     * Add event to queue
     */
    async enqueue(eventId, provider, eventType, payload) {
        try {
            const result = await pool.query(
                `INSERT INTO webhook_queue (event_id, provider, event_type, payload)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (event_id) DO NOTHING
                 RETURNING *`,
                [eventId, provider, eventType, JSON.stringify(payload)]
            );
            
            if (result.rows.length > 0) {
                logger.info(`Webhook queued: ${provider}/${eventType} (${eventId})`);
            }
            
            return result.rows[0] || null;
        } catch (err) {
            logger.error('Failed to queue webhook:', err);
            throw err;
        }
    }

    /**
     * Process pending webhooks
     */
    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        try {
            // Get pending webhooks that haven't exceeded max attempts
            const { rows: pendingWebhooks } = await pool.query(
                `SELECT * FROM webhook_queue 
                 WHERE status = 'pending' 
                 AND attempts < max_attempts
                 AND (updated_at < NOW() - INTERVAL '5 seconds' OR attempts = 0)
                 ORDER BY created_at ASC
                 LIMIT 10`
            );

            for (const webhook of pendingWebhooks) {
                await this.processWebhook(webhook);
            }

        } catch (err) {
            logger.error('Error processing webhook queue:', err);
        } finally {
            this.processing = false;
        }
    }

    /**
     * Process individual webhook
     */
    async processWebhook(webhook) {
        const { id, event_id, provider, event_type, payload, attempts } = webhook;
        
        try {
            // Mark as processing
            await pool.query(
                `UPDATE webhook_queue 
                 SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
                 WHERE id = $1`,
                [id]
            );

            // Process based on provider
            let success = false;
            
            switch (provider) {
                case 'stripe':
                    success = await this.processStripeWebhook(event_type, payload);
                    break;
                case 'shippo':
                    success = await this.processShippoWebhook(event_type, payload);
                    break;
                default:
                    logger.warn(`Unknown webhook provider: ${provider}`);
                    success = true; // Mark as processed to avoid retry loop
            }

            if (success) {
                await pool.query(
                    `UPDATE webhook_queue 
                     SET status = 'completed', processed_at = NOW(), updated_at = NOW()
                     WHERE id = $1`,
                    [id]
                );
                logger.info(`Webhook processed successfully: ${event_id}`);
            } else {
                throw new Error('Webhook processor returned false');
            }

        } catch (err) {
            await this.handleWebhookError(id, event_id, err, attempts);
        }
    }

    /**
     * Handle webhook processing error
     */
    async handleWebhookError(id, eventId, error, attempts) {
        const isFinalAttempt = attempts >= 2; // 0-indexed, so 2 is 3rd attempt
        
        await pool.query(
            `UPDATE webhook_queue 
             SET status = $1, last_error = $2, updated_at = NOW()
             WHERE id = $3`,
            [isFinalAttempt ? 'failed' : 'pending', error.message.substring(0, 500), id]
        );

        logger.error({
            message: `Webhook failed (attempt ${attempts + 1}/3)`,
            eventId,
            error: error.message,
            isFinalAttempt
        });

        // Alert admin on final failure
        if (isFinalAttempt) {
            await this.alertAdmin(eventId, error);
        }
    }

    /**
     * Process Stripe webhook
     */
    async processStripeWebhook(eventType, payload) {
        try {
            switch (eventType) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(payload);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailure(payload);
                    break;
                case 'charge.refunded':
                    await this.handleRefund(payload);
                    break;
                default:
                    logger.info(`Unhandled Stripe event: ${eventType}`);
            }
            return true;
        } catch (err) {
            logger.error('Stripe webhook processing error:', err);
            return false;
        }
    }

    /**
     * Process Shippo webhook
     */
    async processShippoWebhook(eventType, payload) {
        try {
            switch (eventType) {
                case 'track_updated':
                    await this.handleTrackingUpdate(payload);
                    break;
                case 'transaction_created':
                    await this.handleLabelCreated(payload);
                    break;
                default:
                    logger.info(`Unhandled Shippo event: ${eventType}`);
            }
            return true;
        } catch (err) {
            logger.error('Shippo webhook processing error:', err);
            return false;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(payload) {
        const { data } = payload;
        const paymentIntentId = data.object.id;
        
        // Check if already processed
        const existing = await pool.query(
            'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
            [paymentIntentId]
        );
        
        if (existing.rows.length > 0) {
            logger.info(`Payment ${paymentIntentId} already processed`);
            return;
        }
        
        // Update order status
        await pool.query(
            `UPDATE orders SET status = 'Paid', updated_at = NOW()
             WHERE stripe_payment_intent_id = $1`,
            [paymentIntentId]
        );
        
        logger.info(`Payment succeeded: ${paymentIntentId}`);
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(payload) {
        const { data } = payload;
        const paymentIntentId = data.object.id;
        const errorMessage = data.object.last_payment_error?.message;
        
        await pool.query(
            `UPDATE orders SET status = 'Payment Failed', notes = $1, updated_at = NOW()
             WHERE stripe_payment_intent_id = $2`,
            [errorMessage, paymentIntentId]
        );
        
        logger.warn(`Payment failed: ${paymentIntentId} - ${errorMessage}`);
    }

    /**
     * Handle refund
     */
    async handleRefund(payload) {
        const { data } = payload;
        const paymentIntentId = data.object.payment_intent;
        const amount = data.object.amount_refunded / 100; // Convert from cents
        
        await pool.query(
            `UPDATE orders SET status = 'Refunded', refund_amount = $1, updated_at = NOW()
             WHERE stripe_payment_intent_id = $2`,
            [amount, paymentIntentId]
        );
        
        logger.info(`Refund processed: ${paymentIntentId} - $${amount}`);
    }

    /**
     * Handle tracking update
     */
    async handleTrackingUpdate(payload) {
        const { tracking_number, tracking_status } = payload;
        
        await pool.query(
            `UPDATE orders SET tracking_status = $1, updated_at = NOW()
             WHERE tracking_number = $2`,
            [tracking_status.status, tracking_number]
        );
        
        logger.info(`Tracking updated: ${tracking_number} - ${tracking_status.status}`);
    }

    /**
     * Handle shipping label created
     */
    async handleLabelCreated(payload) {
        logger.info(`Shipping label created: ${payload.object_id}`);
    }

    /**
     * Alert admin on critical failures
     */
    async alertAdmin(eventId, error) {
        logger.error(`🚨 ADMIN ALERT: Webhook ${eventId} failed permanently`);
        
        // Store admin alert
        await pool.query(
            `INSERT INTO error_logs (error_id, message, path, method, severity, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
                eventId,
                `Webhook failed after 3 attempts: ${error.message}`,
                'webhook-processor',
                'WEBHOOK',
                'critical'
            ]
        );
        
        // TODO: Send email notification to admin
        // await sendAdminAlertEmail({ eventId, error: error.message });
    }

    /**
     * Start queue processor (run every 30 seconds)
     */
    start() {
        logger.info('Webhook queue processor started');
        setInterval(() => this.processQueue(), 30000);
    }
}

module.exports = new WebhookQueue();
