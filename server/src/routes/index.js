const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const videoRoutes = require('./videoRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const moderationRoutes = require('./moderationRoutes');

router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/moderation', moderationRoutes);

module.exports = router;
