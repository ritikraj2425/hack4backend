// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
    getUserByUsername,
    getAllUsers,
    updateUserProfile
} = require('../controller/user.controller');

// GET /api/users/:username - Get user by username
router.get('/:username', getUserByUsername);

// GET /api/users/leaderboard/all - Get all users for leaderboard
router.get('/leaderboard/all', getAllUsers);

// PUT /api/users/:userId - Update user profile
router.put('/:userId', updateUserProfile);

module.exports = router;