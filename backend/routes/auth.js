const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db'); // Use destructured pool
const { registerSchema, loginSchema } = require('../utils/validationSchemas');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokenService');
const { sendRegistrationEmail, sendAdminNotificationEmail } = require('../utils/emailService');
const { verifyToken } = require('../middleware/authMiddleware');

// --- SECURITY: Rate Limiting on Login ---
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,              // 5 attempts per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many login attempts. Please try again in 1 minute.' }
});

// @route   POST api/auth/register
// @desc    Register a new user (Wholesale/Admin)
// @access  Public
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.errors });
        }

        const { username, email, password, company_name } = validation.data;

        // Check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Default role is 'wholesale' for public registration. 
        // Admin accounts should be seeded or created by another admin.
        const role = 'wholesale';
        const approval_status = 'pending';

        // Save user
        const newUserQuery = `
            INSERT INTO users (username, email, password_hash, role, approval_status, company_name, phone, address, business_type, website, inquiry_type, contacted_salesperson, message) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
            RETURNING id, username, email, role, approval_status, company_name, created_at
        `;

        const newUserResult = await pool.query(newUserQuery, [
            username,
            email,
            passwordHash,
            role,
            approval_status,
            company_name,
            validation.data.phone,
            validation.data.address,
            validation.data.business_type,
            validation.data.website,
            validation.data.inquiry_type,
            validation.data.contacted_salesperson,
            validation.data.message
        ]);

        const newUser = newUserResult.rows[0];

        // Send Emails (Non-blocking)
        sendRegistrationEmail(newUser).catch(err => console.error('Error sending registration email:', err));

        // Notify Admins (For now sending to a configured admin email or generic)
        // In a real app, you might fetch all admin emails. 
        // For simplicity, we'll send to the EMAIL_FROM or a hardcoded one for this prototype context if needed, 
        // but let's assume there's a main admin email in env or just use a placeholder.
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
        sendAdminNotificationEmail(adminEmail, newUser).catch(err => console.error('Error sending admin notification:', err));

        res.status(201).json({
            msg: 'Registration successful. Account is pending approval.',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                approval_status: newUser.approval_status
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
    try {
        // Validate input
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.errors });
        }

        const { email, password } = validation.data;

        // Check user
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const user = userResult.rows[0];

        // Match password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            // SECURITY: Log failed login attempt
            console.warn(`[SECURITY] Failed login attempt for email: ${email} | IP: ${req.ip} | Time: ${new Date().toISOString()}`);
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Check Approval Status for Wholesale
        if (user.role === 'wholesale' && user.approval_status !== 'approved') {
            return res.status(403).json({
                msg: 'Account pending approval. Please wait for admin confirmation.',
                code: 'PENDING_APPROVAL'
            });
        }

        // Rejection Check
        if (user.approval_status === 'rejected') {
            return res.status(403).json({
                msg: 'Account has been rejected. Contact support.',
                code: 'ACCOUNT_REJECTED'
            });
        }

        // Generate Tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store Refresh Token in DB (for revocation if needed)
        // Ideally verify if user already has one, or replace it.
        await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        // Send Refresh Token in httpOnly Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
            path: '/'
        });

        // Send Access Token in httpOnly Cookie (as requested for redundancy/persistence)
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 Minutes
            path: '/'
        });

        res.json({
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                approval_status: user.approval_status,
                company_name: user.company_name
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// @route   POST api/auth/refresh
// @desc    Refresh Access Token
// @access  Public (Cookie)
router.post('/refresh', async (req, res) => {
    // 1. Check if refresh token exists in cookies
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.status(401).json({ msg: 'No refresh token' });

    const refreshToken = cookies.refreshToken;

    try {
        // SECURITY: Verify token signature & expiration
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // SECURITY: Verify the refresh token actually exists in DB (prevents use of revoked tokens)
        const userResult = await pool.query(
            'SELECT id, role, approval_status FROM users WHERE id = $1 AND refresh_token = $2',
            [decoded.user.id, refreshToken]
        );
        if (userResult.rows.length === 0) {
            return res.status(403).json({ msg: 'Refresh token revoked or invalid' });
        }
        const dbUser = userResult.rows[0];

        // Generate new Access Token using fresh data from DB
        const newAccessToken = jwt.sign(
            {
                user: {
                    id: dbUser.id,
                    role: dbUser.role,
                    approval_status: dbUser.approval_status
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error('Refresh Token Error:', err.message);
        res.status(403).json({ msg: 'Invalid or expired refresh token' });
    }
});

// @route   POST api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(204); // No content

    const refreshToken = cookies.refreshToken;

    // Is refresh token in db?
    const userResult = await pool.query('SELECT * FROM users WHERE refresh_token = $1', [refreshToken]);
    if (userResult.rows.length > 0) {
        // Delete refreshToken in db
        await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userResult.rows[0].id]);
    }

    // Clear cookies
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ msg: 'Logged out' });
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, username, email, role, company_name, approval_status, created_at FROM users WHERE id = $1', [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
