const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All routes require moderator or admin role
router.use(authenticate);
router.use(requireRole(['moderator', 'admin']));

router.get('/queue', moderationController.getQueue);
router.post('/approve/:id', moderationController.approveVideo);
router.post('/reject/:id', moderationController.rejectVideo);
router.get('/flags', moderationController.getFlags);
router.post('/flags/:flagId/resolve', moderationController.resolveFlag);

module.exports = router;
