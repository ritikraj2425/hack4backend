const express = require("express");
const {
    checkAchievements,
    getUserAchievements,
} = require("../controller/achievement.controller");

const router = express.Router();

router.post("/check", checkAchievements);
router.get("/user/:userId", getUserAchievements);

module.exports = router;
