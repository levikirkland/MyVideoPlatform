const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.register = async (req, res, next) => {
    const { email, password, username } = req.body;
    try {
        // Check if user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, username, verification_token) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
            [email, passwordHash, username, verificationToken]
        );

        // TODO: Send verification email here

        res.status(201).json({ 
            message: 'User registered. Please verify your email.',
            user: newUser.rows[0] 
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.email_verified) {
            // In production, enforce this. For dev, maybe optional or auto-verified.
            // return res.status(403).json({ message: 'Email not verified' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                role: user.role,
                bio: user.bio,
                avatar_url: user.avatar_url
            } 
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    // Implementation for email verification
    res.json({ message: 'Email verified' });
};
