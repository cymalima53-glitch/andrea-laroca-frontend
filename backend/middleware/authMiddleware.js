const jwt = require('jsonwebtoken');
const tokenService = require('../utils/tokenService');

// Middleware to verify Access Token
const verifyToken = (req, res, next) => {
    // Get token from header
    const authHeader = req.header('Authorization');
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fallback: Check cookies
    if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware to check for specific roles
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access denied: Insufficient permissions' });
        }
        next();
    };
};

// Middleware to check approval status (for wholesale)
const checkApproval = (req, res, next) => {
    if (req.user && req.user.role === 'wholesale' && req.user.approval_status !== 'approved') {
        return res.status(403).json({ msg: 'Account pending approval' });
    }
    next();
};

module.exports = {
    verifyToken,
    requireRole,
    checkApproval
};
