const logger = require('../utils/logger');
const { pool } = require('../db');

/**
 * Global Error Handler Middleware
 * Catches all errors and handles them appropriately
 */
const errorHandler = async (err, req, res, next) => {
    const errorId = require('uuid').v4();
    
    // Log the error with full context
    logger.error({
        errorId,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        body: sanitizeBody(req.body),
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
    });

    // Store critical errors in database for admin alerts
    if (isCriticalError(err)) {
        try {
            await pool.query(
                `INSERT INTO error_logs (error_id, message, stack, path, method, user_id, severity, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                    errorId,
                    err.message,
                    err.stack,
                    req.path,
                    req.method,
                    req.user?.id || null,
                    getSeverity(err)
                ]
            );
        } catch (dbError) {
            logger.error('Failed to log error to database:', dbError);
        }
    }

    // Send appropriate response to client (don't leak internal details in production)
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: isDevelopment ? err.message : 'Invalid input data',
            errorId
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
            errorId
        });
    }

    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
            error: 'Duplicate Entry',
            message: 'This record already exists',
            errorId
        });
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'External service temporarily unavailable. Please try again.',
            errorId
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'Something went wrong. Please try again.',
        errorId,
        ...(isDevelopment && { stack: err.stack })
    });
};

/**
 * Async handler wrapper - catches errors in async routes
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'password_hash', 'card', 'cvv', 'token', 'secret'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
}

/**
 * Determine if error is critical and needs admin alert
 */
function isCriticalError(err) {
    const criticalCodes = ['ECONNREFUSED', 'ETIMEOUT', 'EPIPE'];
    const criticalMessages = [
        'payment',
        'stripe',
        'database',
        'transaction',
        'webhook'
    ];
    
    const errorString = (err.message + ' ' + err.stack).toLowerCase();
    
    return criticalCodes.includes(err.code) ||
           criticalMessages.some(msg => errorString.includes(msg));
}

/**
 * Get error severity level
 */
function getSeverity(err) {
    if (err.status >= 500 || err.code === 'ECONNREFUSED') return 'critical';
    if (err.status >= 400) return 'warning';
    return 'info';
}

module.exports = {
    errorHandler,
    asyncHandler
};
