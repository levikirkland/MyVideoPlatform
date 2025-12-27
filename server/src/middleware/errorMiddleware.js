const multer = require('multer');

exports.errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Handle multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 500MB.' });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 500MB.' });
        }
        return res.status(400).json({ message: `File upload error: ${err.message}` });
    }

    // Handle custom multer file filter errors
    if (err.message === 'Not a video file') {
        return res.status(400).json({ message: 'Please upload a valid video file' });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
};
