const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');

router.post('/membership/renewal', membershipController.handleRenewalWebhook);
router.post('/membership/expiration', membershipController.handleExpirationWebhook);

module.exports = router;
