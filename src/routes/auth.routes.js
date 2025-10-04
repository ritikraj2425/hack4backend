// In your routes file
const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');

// Make sure this matches what you're using in frontend
router.get('/github/callback', authController.githubCallback);
router.get('/check', authController.checkAuth);
router.get('/logout', authController.logout);

module.exports = router;