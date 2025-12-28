const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const videoRoutes = require('./videoRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const moderationRoutes = require('./moderationRoutes');
const membershipRoutes = require('./membershipRoutes');
const webhookRoutes = require('./webhookRoutes');

router.use('/auth', authRoutes);
router.use('/membership', membershipRoutes);
router.use('/videos', videoRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/moderation', moderationRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
