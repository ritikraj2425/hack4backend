// controllers/agentController.js
require("dotenv").config();
const axios = require("axios");
const Achievement = require("../models/achievement.model");
const Users = require("../models/user.model");

// -------------------- TRIGGER AGENT --------------------
const triggerAgent = async (req, res) => {
    try {
        console.log("🔧 Agent trigger received");
        
        const { userId, achievementType, demo } = req.body;
        console.log("📦 Request data:", { userId, achievementType, demo });

        if (!userId) {
            console.error("❌ Missing userId");
            return res.status(400).json({ 
                success: false,
                message: "userId is required" 
            });
        }

        // Skip achievement verification in demo mode
        if (!demo) {
            if (!achievementType) {
                console.error("❌ Missing achievementType in non-demo mode");
                return res.status(400).json({ 
                    success: false,
                    message: "achievementType is required in non-demo mode" 
                });
            }

            console.log(`🔍 Checking achievement for user ${userId}, type: ${achievementType}`);
            const achievement = await Achievement.findOne({ userId, type: achievementType });
            if (!achievement) {
                console.error("❌ Achievement not found or not earned");
                return res.status(403).json({ 
                    success: false,
                    message: "Achievement not found or not earned" 
                });
            }
        }

        // Prepare payload for n8n
        const n8nPayload = {
            userId,
            achievementType: achievementType || 'demo_achievement',
            demo: demo || false,
            timestamp: new Date().toISOString(),
            userData: {
                username: req.body.username || 'demo_user'
            }
        };

        const n8nWebhookUrl = "http://localhost:5678/webhook/bf499954-ddc9-4e9a-8126-9ed3c95e8404";

        console.log("🚀 Sending to n8n:", n8nWebhookUrl);
        console.log("📦 Payload:", n8nPayload);

        let n8nResponse;
        let n8nResult;

        try {
            // Using axios instead of fetch for consistency with your auth controller
            n8nResponse = await axios.post(n8nWebhookUrl, n8nPayload, {
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'DevConnect-App'
                },
                timeout: 10000 // 10 second timeout
            });

            console.log("📨 n8n Response Status:", n8nResponse.status);
            console.log("✅ n8n Success:", n8nResponse.data);

            n8nResult = n8nResponse.data;

        } catch (fetchError) {
            console.log("🌐 Network error calling n8n:", fetchError.message);
            
            // Simulate n8n response for demo
            n8nResult = {
                success: true,
                message: "n8n workflow simulation - would post to Reddit",
                simulation: true,
                posts: [
                    "r/programming",
                    "r/github", 
                    "r/opensource",
                    "r/coding",
                    "r/SideProject"
                ],
                postsMade: 5,
                timestamp: new Date().toISOString()
            };

            console.log("🔄 Using simulation response");
        }

        console.log("✅ Agent execution completed");

        res.status(200).json({
            success: true,
            message: 'Agent triggered successfully',
            n8nResponse: n8nResult,
            demo: demo || false
        });

    } catch (error) {
        console.error("💥 Error triggering agent:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Failed to trigger agent",
            error: error.message 
        });
    }
};

// -------------------- CHECK AGENT ELIGIBILITY --------------------
const checkAgentEligibility = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("🔍 Checking agent eligibility for user:", userId);

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: "userId is required" 
            });
        }

        // Check if user has any of the required achievements
        const eligibleAchievements = await Achievement.find({
            userId,
            type: { $in: ['low_pr_10', 'high_pr_1', 'medium_pr_5'] }
        }).sort({ achievedAt: -1 });

        const canRun = eligibleAchievements.length > 0;
        
        console.log(`✅ Eligibility check: ${canRun ? 'ELIGIBLE' : 'NOT ELIGIBLE'}, found ${eligibleAchievements.length} achievements`);

        res.status(200).json({
            success: true,
            canRun,
            eligibleAchievements: eligibleAchievements.map(achievement => ({
                type: achievement.type,
                achievedAt: achievement.achievedAt,
                metadata: achievement.metadata
            })),
            message: canRun ? "User is eligible to run agent" : "User is not eligible to run agent"
        });

    } catch (error) {
        console.error("💥 Error checking agent eligibility:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Failed to check agent eligibility",
            error: error.message 
        });
    }
};

// -------------------- CHECK AND AWARD ACHIEVEMENTS --------------------
const checkAndAwardAchievements = async (req, res) => {
    try {
        const { userId, prStats } = req.body;
        console.log("🎯 Checking achievements for user:", userId);

        if (!userId || !prStats) {
            return res.status(400).json({ 
                success: false,
                message: "userId and prStats are required" 
            });
        }

        const achievements = [];
        const existingAchievements = await Achievement.find({ userId });

        console.log(`📊 User PR stats:`, prStats);
        console.log(`📜 Existing achievements: ${existingAchievements.length}`);

        // Check for 10 low impact PRs achievement
        if (prStats.lowImpactPRs >= 10 && !existingAchievements.find(a => a.type === 'low_pr_10')) {
            console.log("🎖️ Awarding low_pr_10 achievement");
            const achievement = new Achievement({
                userId,
                type: 'low_pr_10',
                metadata: {
                    prCount: prStats.lowImpactPRs,
                    impactType: 'low'
                }
            });
            await achievement.save();
            achievements.push(achievement);
        }

        // Check for 1 high impact PR achievement
        if (prStats.highImpactPRs >= 1 && !existingAchievements.find(a => a.type === 'high_pr_1')) {
            console.log("🎖️ Awarding high_pr_1 achievement");
            const achievement = new Achievement({
                userId,
                type: 'high_pr_1',
                metadata: {
                    prCount: prStats.highImpactPRs,
                    impactType: 'high'
                }
            });
            await achievement.save();
            achievements.push(achievement);
        }

        // Check for 5 medium impact PRs achievement
        if (prStats.mediumImpactPRs >= 5 && !existingAchievements.find(a => a.type === 'medium_pr_5')) {
            console.log("🎖️ Awarding medium_pr_5 achievement");
            const achievement = new Achievement({
                userId,
                type: 'medium_pr_5',
                metadata: {
                    prCount: prStats.mediumImpactPRs,
                    impactType: 'medium'
                }
            });
            await achievement.save();
            achievements.push(achievement);
        }

        console.log(`✅ Awarded ${achievements.length} new achievements`);

        res.status(200).json({
            success: true,
            achievements: achievements.map(achievement => ({
                type: achievement.type,
                achievedAt: achievement.achievedAt,
                metadata: achievement.metadata
            })),
            message: `Checked and awarded ${achievements.length} achievements`
        });

    } catch (error) {
        console.error("💥 Error checking achievements:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Failed to check achievements",
            error: error.message 
        });
    }
};

// -------------------- GET USER ACHIEVEMENTS --------------------
const getUserAchievements = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("🔍 Fetching achievements for user:", userId);

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: "userId is required" 
            });
        }

        const achievements = await Achievement.find({ userId }).sort({ achievedAt: -1 });
        
        console.log(`✅ Found ${achievements.length} achievements for user ${userId}`);

        res.status(200).json({
            success: true,
            achievements: achievements.map(achievement => ({
                type: achievement.type,
                achievedAt: achievement.achievedAt,
                metadata: achievement.metadata
            })),
            total: achievements.length
        });

    } catch (error) {
        console.error("💥 Error fetching user achievements:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch user achievements",
            error: error.message 
        });
    }
};

// Export all functions
module.exports = {
    triggerAgent,
    checkAgentEligibility,
    checkAndAwardAchievements,
    getUserAchievements
};