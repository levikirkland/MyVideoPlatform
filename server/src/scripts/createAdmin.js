require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'videoplatform',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function createAdmin() {
    const email = 'admin@myadultlibrary.com';
    const password = 'password123'; // Default password
    const username = 'AdminUser';

    try {
        console.log('Connecting to database...');
        
        // Check if user exists
        const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (checkRes.rows.length > 0) {
            console.log('User already exists. Updating role to admin...');
            await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
            console.log('User role updated to admin.');
        } else {
            console.log('Creating new admin user...');
            const passwordHash = await bcrypt.hash(password, 10);
            const verificationToken = uuidv4();

            const res = await pool.query(
                `INSERT INTO users (email, password_hash, username, role, is_verified, email_verified, verification_token)
                 VALUES ($1, $2, $3, 'admin', true, true, $4)
                 RETURNING id, email, role`,
                [email, passwordHash, username, verificationToken]
            );
            console.log('Admin user created:', res.rows[0]);
        }
    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        await pool.end();
    }
}

createAdmin();
