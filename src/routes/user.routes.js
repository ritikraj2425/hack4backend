const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');

// ... other routes ...

router.get('/profile', authController.getUserProfile);

module.exports = router;