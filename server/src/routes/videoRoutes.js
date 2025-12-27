const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticate, requireRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const thumbnailUpload = require('../middleware/thumbnailMiddleware');

// Wrapper to handle async errors
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public routes
router.get('/', videoController.listVideos);
router.get('/categories', videoController.listCategories);
router.get('/community', videoController.getCommunityVideos);

// User specific lists (Must be before /:id)
router.get('/favorites', authenticate, videoController.getFavorites);
router.get('/history', authenticate, videoController.getHistory);
router.delete('/history/all', authenticate, videoController.clearHistory);

// Creator specific routes
router.get('/creator/my-videos', authenticate, videoController.getCreatorVideos);
router.get('/creator/follow-requests', authenticate, videoController.getFollowRequests);
router.put('/creator/follow-requests/:followerId', authenticate, videoController.processFollowRequest);

router.get('/:id', optionalAuthenticate, videoController.getVideo);

// Protected routes - Upload with proper error handling
router.post('/upload', 
    authenticate, 
    requireRole(['user', 'creator', 'admin']),
    asyncHandler(async (req, res, next) => {
        upload.single('video')(req, res, (err) => {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: err.message || 'File upload failed' });
            }
            // Proceed to controller
            videoController.uploadVideo(req, res, next);
        });
    })
);

router.post('/:id/rate', authenticate, videoController.rateVideo);
router.post('/:id/flag', authenticate, videoController.flagVideo);
router.post('/:id/thumbnail', authenticate, thumbnailUpload.single('thumbnail'), videoController.updateThumbnail);
router.put('/:id', authenticate, videoController.updateVideo);
router.delete('/:id', authenticate, videoController.deleteVideo);
router.post('/:id/favorite', authenticate, videoController.toggleFavorite);
router.post('/:id/history', authenticate, videoController.recordHistory);
router.delete('/:id/history', authenticate, videoController.removeFromHistory);
router.post('/:id/removal-request', authenticate, videoController.requestRemoval);

// Comments
router.get('/:id/comments', videoController.getComments);
router.post('/:id/comments', authenticate, videoController.addComment);
router.delete('/comments/:commentId', authenticate, videoController.deleteComment);

module.exports = router;
