require("dotenv").config();
const Achievement = require("../models/achievement.model");
const Post = require("../models/post.model");

// -------------------- CHECK & AWARD ACHIEVEMENTS --------------------
const checkAchievements = async (req, res) => {
    try {
        const { userId, prStats } = req.body;

        if (!userId || !prStats) {
            return res.status(400).json({ error: "userId and prStats are required" });
        }

        const achievements = [];
        const existingAchievements = await Achievement.find({ userId });

        // 🎯 Check for 10 low impact PRs achievement
        if (
            prStats.lowImpactPRs >= 10 &&
            !existingAchievements.find((a) => a.type === "low_pr_10")
        ) {
            const achievement = new Achievement({
                userId,
                type: "low_pr_10",
                metadata: {
                    prCount: prStats.lowImpactPRs,
                    impactType: "low",
                },
            });
            await achievement.save();
            achievements.push(achievement);
        }

        // 🏆 Check for 1 high impact PR achievement
        if (
            prStats.highImpactPRs >= 1 &&
            !existingAchievements.find((a) => a.type === "high_pr_1")
        ) {
            const achievement = new Achievement({
                userId,
                type: "high_pr_1",
                metadata: {
                    prCount: prStats.highImpactPRs,
                    impactType: "high",
                },
            });
            await achievement.save();
            achievements.push(achievement);
        }

        res.json({ achievements });
    } catch (error) {
        console.error("❌ Error checking achievements:", error);
        res.status(500).json({ error: "Failed to check achievements" });
    }
};

// -------------------- GET USER ACHIEVEMENTS --------------------
const getUserAchievements = async (req, res) => {
    try {
        const { userId } = req.params;
        const achievements = await Achievement.find({ userId }).sort({
            achievedAt: -1,
        });
        res.json({ achievements });
    } catch (error) {
        console.error("❌ Error fetching achievements:", error);
        res.status(500).json({ error: "Failed to fetch achievements" });
    }
};

module.exports = {
    checkAchievements,
    getUserAchievements,
};
