require('dotenv').config();
const { pool } = require('../config/db');

async function addMessagesTable() {
  try {
    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('Messages table created/verified');

    // Create indexes for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC)
    `);
    console.log('Indexes created');

    // Add banner_url to users table if not exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT
    `);
    console.log('Added banner_url column to users');

    console.log('All migrations complete!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

addMessagesTable();
