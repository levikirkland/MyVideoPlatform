const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorHandler } = require('./middleware/errorMiddleware');
const routes = require('./routes');

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const corsOptions = {
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static content with CORS headers
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1', routes);

// Error Handling - must be last
app.use((err, req, res, next) => {
    console.error('Error caught by app error handler:', err);
    
    // Handle multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 500MB.' });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 500MB.' });
        }
        return res.status(400).json({ message: `File upload error: ${err.message}` });
    }

    // Handle custom errors
    if (err.message === 'Not a video file') {
        return res.status(400).json({ message: 'Please upload a valid video file' });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
});

module.exports = app;
