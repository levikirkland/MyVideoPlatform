require('dotenv').config();
const { pool } = require('../config/db');

async function addCommunityColumn() {
    try {
        console.log('Adding is_community column to videos...');
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE;
        `);
        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error);
        process.exit(1);
    }
}

addCommunityColumn();
