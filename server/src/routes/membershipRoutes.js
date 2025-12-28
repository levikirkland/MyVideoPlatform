const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/checkout', authenticate, membershipController.startCheckout);
router.get('/status', authenticate, membershipController.getStatus);

// Dev-only: simulate payment completion (disabled in production)
if (process.env.NODE_ENV !== 'production') {
    router.post('/dev/complete', authenticate, membershipController.devCompleteCheckout);
}

module.exports = router;
