const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticate, requireRole, requireMembership } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const thumbnailUpload = require('../middleware/thumbnailMiddleware');

// Wrapper to handle async errors
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public routes
router.get('/categories', videoController.listCategories);

// Membership-protected routes
router.get('/', authenticate, requireMembership, videoController.listVideos);
router.get('/community', authenticate, requireMembership, videoController.getCommunityVideos);

// User specific lists (Must be before /:id)
router.get('/favorites', authenticate, requireMembership, videoController.getFavorites);
router.get('/history', authenticate, requireMembership, videoController.getHistory);
router.delete('/history/all', authenticate, requireMembership, videoController.clearHistory);

// Creator specific routes
router.get('/creator/my-videos', authenticate, requireMembership, videoController.getCreatorVideos);
router.get('/creator/follow-requests', authenticate, requireMembership, videoController.getFollowRequests);
router.put('/creator/follow-requests/:followerId', authenticate, requireMembership, videoController.processFollowRequest);

router.get('/:id', authenticate, requireMembership, videoController.getVideo);

// Protected routes - Upload with proper error handling
router.post('/upload', 
    authenticate,
    requireMembership,
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

router.post('/:id/rate', authenticate, requireMembership, videoController.rateVideo);
router.post('/:id/flag', authenticate, requireMembership, videoController.flagVideo);
router.post('/:id/thumbnail', authenticate, requireMembership, thumbnailUpload.single('thumbnail'), videoController.updateThumbnail);
router.put('/:id', authenticate, requireMembership, videoController.updateVideo);
router.delete('/:id', authenticate, requireMembership, videoController.deleteVideo);
router.post('/:id/favorite', authenticate, requireMembership, videoController.toggleFavorite);
router.post('/:id/history', authenticate, requireMembership, videoController.recordHistory);
router.delete('/:id/history', authenticate, requireMembership, videoController.removeFromHistory);
router.post('/:id/removal-request', authenticate, videoController.requestRemoval);

// Comments
router.get('/:id/comments', authenticate, requireMembership, videoController.getComments);
router.post('/:id/comments', authenticate, requireMembership, videoController.addComment);
router.delete('/comments/:commentId', authenticate, requireMembership, videoController.deleteComment);

// Manual access controls
router.get('/:id/access', authenticate, requireMembership, requireRole(['creator', 'admin']), videoController.listVideoAccess);
router.post('/:id/access', authenticate, requireMembership, requireRole(['creator', 'admin']), videoController.grantVideoAccess);
router.delete('/:id/access/:username', authenticate, requireMembership, requireRole(['creator', 'admin']), videoController.revokeVideoAccess);
router.put('/:id/access-mode', authenticate, requireMembership, requireRole(['creator', 'admin']), videoController.updateVideoAccessMode);

module.exports = router;
