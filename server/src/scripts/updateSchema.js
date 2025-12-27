require('dotenv').config();
const { pool } = require('../config/db');

async function updateSchema() {
    try {
        console.log('Adding ban columns to users table...');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS ban_reason TEXT;
        `);

        console.log('Ban columns added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
