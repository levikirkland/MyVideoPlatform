const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/audit-logs', adminController.getAuditLogs);

// Categories
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Tags
router.get('/tags', adminController.listTags);
router.post('/tags', adminController.createTag);
router.put('/tags/:id/approve', adminController.approveTag);
router.delete('/tags/:id', adminController.deleteTag);

// User Ban
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);

// Creator Requests
router.get('/creator-requests', adminController.listCreatorRequests);
router.put('/creator-requests/:id', adminController.processCreatorRequest);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Removal Requests
router.get('/removal-requests', adminController.listRemovalRequests);
router.post('/removal-requests/:id/process', adminController.processRemovalRequest);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Video Management
router.put('/videos/:id', adminController.updateVideo);
router.post('/videos/:id/tags', adminController.addTagToVideo);

module.exports = router;
