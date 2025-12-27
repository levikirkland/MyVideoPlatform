const { pool } = require('../config/db');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function addBanColumns() {
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
        console.error('Error adding ban columns:', error);
        process.exit(1);
    }
}

addBanColumns();
