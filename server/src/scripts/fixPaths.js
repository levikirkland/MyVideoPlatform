require('dotenv').config();
const { pool } = require('../config/db');

async function fixVideoPaths() {
    try {
        console.log('Starting video path fix...');
        
        // Get all videos
        const result = await pool.query('SELECT id, video_url FROM videos');
        
        for (const video of result.rows) {
            if (video.video_url && video.video_url.includes('server/uploads/')) {
                // Extract filename from the absolute path
                // Assumes path ends with .../server/uploads/filename.mp4
                const parts = video.video_url.split('uploads/');
                if (parts.length > 1) {
                    const filename = parts[parts.length - 1];
                    const newPath = `/uploads/${filename}`;
                    
                    console.log(`Fixing video ${video.id}: ${video.video_url} -> ${newPath}`);
                    
                    await pool.query('UPDATE videos SET video_url = $1 WHERE id = $2', [newPath, video.id]);
                }
            } else if (video.video_url && video.video_url.includes('\\uploads\\')) {
                 // Handle Windows backslashes if present
                 const parts = video.video_url.split('uploads\\');
                 if (parts.length > 1) {
                     const filename = parts[parts.length - 1];
                     const newPath = `/uploads/${filename}`;
                     
                     console.log(`Fixing video ${video.id}: ${video.video_url} -> ${newPath}`);
                     
                     await pool.query('UPDATE videos SET video_url = $1 WHERE id = $2', [newPath, video.id]);
                 }
            }
        }
        
        console.log('Video path fix completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing video paths:', error);
        process.exit(1);
    }
}

fixVideoPaths();
