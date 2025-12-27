require('dotenv').config();
const { pool } = require('../config/db');

async function updateSchema() {
    try {
        console.log('Creating system_settings table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO system_settings (key, value) 
            VALUES ('auto_unpublish_threshold', '3')
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
