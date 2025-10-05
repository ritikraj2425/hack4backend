// routes/auth.routes.js
const express = require('express');
const router = express.Router(); // Use Express Router
const authController = require('../controller/auth.controller');
const userController = require('../controller/user.controller')

// Debug: Check if functions are available
console.log('🔍 Auth Controller Methods:', {
    githubCallback: typeof authController.githubCallback,
    checkAuth: typeof authController.checkAuth,
    getCurrentUser: typeof authController.getCurrentUser,
    getUserPRs: typeof authController.getUserPRs,
    logout: typeof authController.logout
});

// Define routes
router.get('/github/callback', authController.githubCallback);
router.get('/check', authController.checkAuth);
router.get('/user', authController.getCurrentUser);
router.get('/user/prs', authController.getUserPRs);
router.get('/logout', authController.logout);
router.get('/users', authController.getAllUsers); // Add this line
router.get('/user/:username', authController.getUserByUsername);


router.get('/leaderboard', userController.getAllUsers);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' });
});

module.exports = router;