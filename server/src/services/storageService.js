const fs = require('fs');
const path = require('path');

// Configuration
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Storage Service Abstraction
 * Currently implements Local File System storage.
 * Can be easily swapped for S3StorageService in the future.
 */
class StorageService {
    
    /**
     * Get the full local path for a file (used for processing)
     */
    getLocalPath(filename) {
        return path.join(UPLOADS_DIR, filename);
    }

    /**
     * Get the public URL for a file
     */
    getFileUrl(filename) {
        // In S3, this would return https://bucket.s3.region.amazonaws.com/filename
        return `/uploads/${filename}`;
    }

    /**
     * Delete a file
     */
    async deleteFile(filename) {
        const filepath = this.getLocalPath(filename);
        if (fs.existsSync(filepath)) {
            await fs.promises.unlink(filepath);
        }
    }
}

module.exports = new StorageService();
