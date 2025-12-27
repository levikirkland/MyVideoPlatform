const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validationMiddleware');

router.post('/register', [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    validate
], authController.register);

router.post('/login', [
    body('email').isEmail(),
    body('password').exists(),
    validate
], authController.login);

router.post('/verify-email', authController.verifyEmail);

module.exports = router;
