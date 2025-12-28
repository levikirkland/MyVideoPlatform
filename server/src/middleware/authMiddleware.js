const jwt = require('jsonwebtoken');
const membershipService = require('../services/membershipService');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set. Using fallback devsecret. Do not use in production.');
}

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

exports.optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        // If token is invalid, we just proceed without user
        next();
    }
};

exports.requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

exports.requireMembership = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    if (['admin', 'moderator', 'creator'].includes(req.user.role)) {
        return next();
    }

    try {
        const active = await membershipService.hasActiveMembership(req.user.id);
        if (!active) {
            return res.status(402).json({ message: 'Membership required' });
        }
        next();
    } catch (error) {
        next(error);
    }
};
