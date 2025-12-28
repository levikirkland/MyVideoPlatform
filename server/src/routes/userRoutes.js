const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.post('/creator-request', authenticate, userController.requestCreatorStatus);
router.post('/:id/follow', authenticate, userController.followUser);
router.post('/:id/unfollow', authenticate, userController.unfollowUser);
router.post('/:id/message', authenticate, userController.sendMessage);
router.get('/:id', userController.getUserPublicProfile);

module.exports = router;
