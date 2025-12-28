require('dotenv').config();
const { pool } = require('./src/config/db');

async function fixTables() {
    try {
        // Fix video_access table
        console.log('Fixing video_access table...');
        await pool.query(`
            ALTER TABLE video_access 
            ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        `);
        await pool.query(`
            ALTER TABLE video_access 
            ADD COLUMN IF NOT EXISTS granted_by_creator_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        await pool.query(`
            UPDATE video_access va
            SET username = u.username
            FROM users u
            WHERE va.user_id = u.id AND va.username IS NULL;
        `);
        
        // Fix memberships table
        console.log('Fixing memberships table...');
        await pool.query(`
            ALTER TABLE memberships 
            ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 500;
        `);
        await pool.query(`
            ALTER TABLE memberships 
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD';
        `);
        await pool.query(`
            ALTER TABLE memberships 
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        `);
        
        console.log('Tables fixed successfully');
        
        // Check structures
        const va = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'video_access'"
        );
        console.log('video_access columns:', va.rows.map(r => r.column_name));
        
        const m = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'memberships'"
        );
        console.log('memberships columns:', m.rows.map(r => r.column_name));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

fixTables();
