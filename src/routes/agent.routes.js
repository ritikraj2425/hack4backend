// routes/agent.js
const express = require('express');
const router = express.Router();
const {
    triggerAgent,
    checkAgentEligibility,
    checkAndAwardAchievements,
    getUserAchievements
} = require('../controller/agent.controller');

// POST /api/agent/trigger - Trigger n8n agent
router.post('/trigger', triggerAgent);

// GET /api/agent/can-run/:userId - Check if user can run agent
router.get('/can-run/:userId', checkAgentEligibility);

// POST /api/agent/check-achievements - Check and award achievements based on PR stats
router.post('/check-achievements', checkAndAwardAchievements);

// GET /api/agent/achievements/:userId - Get user achievements
router.get('/achievements/:userId', getUserAchievements);

module.exports = router;