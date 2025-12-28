const { generateThumbnail, getVideoMetadata } = require('../utils/videoProcessor');
const { pool } = require('../config/db');
const storageService = require('./storageService');

class QueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * Add a video processing job to the queue
     * @param {Object} jobData - { videoId, filename, filePath }
     */
    addJob(jobData) {
        console.log(`[Queue] Job added for video ${jobData.videoId}`);
        this.queue.push(jobData);
        this.processNext();
    }

    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        const job = this.queue.shift();

        try {
            console.log(`[Queue] Processing video ${job.videoId}...`);
            await this.processVideo(job);
            console.log(`[Queue] Video ${job.videoId} processed successfully.`);
        } catch (error) {
            console.error(`[Queue] Error processing video ${job.videoId}:`, error);
            // Optionally update video status to 'error'
        } finally {
            this.isProcessing = false;
            this.processNext();
        }
    }

    async processVideo(job) {
        const { videoId, filename, filePath } = job;

        try {
            // 1. Generate Thumbnail
            // Note: generateThumbnail currently expects an output dir. 
            // We should update it to use storageService or just pass the uploads dir.
            const uploadsDir = require('path').dirname(filePath);
            const thumbnailFilename = await generateThumbnail(filePath, filename, uploadsDir);

            // 2. Get Metadata (Duration)
            const metadata = await getVideoMetadata(filePath);
            const duration = Math.round(metadata.format.duration || 0);

            // 3. Update Database
            await pool.query(
                `UPDATE videos 
                 SET thumbnail_url = $1, 
                     duration_seconds = $2, 
                     status = 'pending_approval' 
                 WHERE id = $3`,
                [storageService.getFileUrl(thumbnailFilename), duration, videoId]
            );

        } catch (error) {
            console.error('Processing failed:', error);
            // Mark as rejected or error if processing fails
             await pool.query(
                "UPDATE videos SET status = 'rejected', rejection_reason = 'Processing failed (Invalid file)' WHERE id = $1",
                [videoId]
            );
            throw error;
        }
    }
}

module.exports = new QueueService();
