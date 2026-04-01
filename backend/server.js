const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const db = require('./db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const webhookQueue = require('./utils/webhookQueue');

// Basic Route Imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const catalogueRoutes = require('./routes/catalogue');
const uploadRoutes = require('./routes/upload');
const orderRoutes = require('./routes/orders');
const wholesaleRoutes = require('./routes/wholesale');
const retailOrdersRoutes = require('./routes/retail-orders');
const paymentsRoutes = require('./routes/payments');
const shippingRoutes = require('./routes/shipping');

// SECURITY: Setup routes removed in production
// const setupRoutes = require('./routes/setup');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// SECURITY: Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "https://res.cloudinary.com", "https://images.unsplash.com", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow images from other domains
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// SECURITY: CORS with environment-based origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://andrea-laroca-frontend.vercel.app', 'https://andrea-laroca-frontend-b0ozp5yi6-kama1.vercel.app'];
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`[SECURITY] CORS blocked request from: ${origin}`);
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body size limit: 1mb allows product/catalogue forms with many variants + Cloudinary URLs
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// SECURITY: Request logging in production
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
        next();
    });
}

// Test DB Connection
db.pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
    release();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders/retail', retailOrdersRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wholesale', wholesaleRoutes);
app.use('/api/retail', require('./routes/retail'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipping', shippingRoutes);

// SECURITY: Setup routes disabled in production
// app.use('/api/setup', setupRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ 
        status: 'La Rocca Backend Server is Running',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// SECURITY: 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler (comprehensive logging and safe responses)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
    logger.info(`🔒 Environment: ${NODE_ENV}`);
    logger.info(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`);
    
    // Start webhook queue processor
    webhookQueue.start();
});
