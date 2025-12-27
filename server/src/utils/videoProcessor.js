const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

/**
 * Generates a thumbnail for a video file.
 * @param {string} videoPath - Absolute path to the video file.
 * @param {string} filename - Filename of the video (used to name the thumbnail).
 * @param {string} outputDir - Directory to save the thumbnail.
 * @returns {Promise<string>} - The filename of the generated thumbnail.
 */
exports.generateThumbnail = (videoPath, filename, outputDir) => {
    return new Promise((resolve, reject) => {
        const thumbnailFilename = `thumb-${path.parse(filename).name}.png`;
        
        ffmpeg(videoPath)
            .on('end', () => {
                console.log(`Thumbnail generated: ${thumbnailFilename}`);
                resolve(thumbnailFilename);
            })
            .on('error', (err) => {
                console.error('Error generating thumbnail:', err);
                reject(err);
            })
            .screenshots({
                count: 1,
                folder: outputDir,
                filename: thumbnailFilename,
                size: '640x?' // Preserve aspect ratio, 640px width for better quality
            });
    });
};

/**
 * Gets metadata for a video file (duration, etc).
 * @param {string} videoPath - Absolute path to the video file.
 * @returns {Promise<Object>} - Metadata object.
 */
exports.getVideoMetadata = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                console.error('Error getting metadata:', err);
                reject(err);
            } else {
                resolve(metadata);
            }
        });
    });
};
