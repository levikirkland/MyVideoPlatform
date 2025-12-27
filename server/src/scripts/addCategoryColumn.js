require('dotenv').config();
const { pool } = require('../config/db');

async function addCategoryToVideos() {
    try {
        console.log('Adding category_id to videos table...');
        
        await pool.query(`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        `);

        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error);
        process.exit(1);
    }
}

addCategoryToVideos();
