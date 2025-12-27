require('dotenv').config();
const { pool } = require('../config/db');

async function updateSchema() {
    try {
        console.log('Updating schema for Creator and Follow features...');

        // 1. Add columns to users
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_request_status') THEN
                    CREATE TYPE creator_request_status AS ENUM ('none', 'pending', 'approved', 'rejected');
                END IF;
            END $$;

            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS creator_status creator_request_status DEFAULT 'none',
            ADD COLUMN IF NOT EXISTS creator_id_url VARCHAR(255),
            ADD COLUMN IF NOT EXISTS has_community_access BOOLEAN DEFAULT FALSE;
        `);

        // 2. Add is_private to videos
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
        `);

        // 3. Create follows table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS follows (
                follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
                following_id UUID REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, following_id)
            );
        `);

        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
