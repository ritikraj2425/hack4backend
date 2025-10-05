// controllers/userController.js
require("dotenv").config();
const Users = require("../models/user.model");

// -------------------- GET USER BY USERNAME --------------------
const getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        console.log("🔍 Fetching user by username:", username);

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Username is required"
            });
        }

        // Find user by username, exclude sensitive information
        const user = await Users.findOne({ username: username.toLowerCase() })
            .select('-password -githubToken -__v -updatedAt');

        if (!user) {
            console.log("❌ User not found:", username);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("✅ User found:", user.username);

        // Get leaderboard data to calculate rank and score
        const allUsers = await Users.find()
            .select('stats username')
            .sort({ 'stats.totalMergedPRs': -1, 'stats.highImpactPRs': -1 });

        // Calculate score and rank
        let userScore = 0;
        let userRank = 0;

        if (user.stats) {
            userScore = (user.stats.highImpactPRs * 10) + 
                       (user.stats.mediumImpactPRs * 5) + 
                       (user.stats.lowImpactPRs * 2);
        }

        // Calculate rank based on score
        const rankedUsers = allUsers.map(u => {
            const stats = u.stats || { highImpactPRs: 0, mediumImpactPRs: 0, lowImpactPRs: 0 };
            const score = (stats.highImpactPRs * 10) + (stats.mediumImpactPRs * 5) + (stats.lowImpactPRs * 2);
            return { username: u.username, score };
        }).sort((a, b) => b.score - a.score);

        userRank = rankedUsers.findIndex(u => u.username === user.username) + 1;
        if (userRank === 0) userRank = rankedUsers.length + 1;

        // Prepare user profile response
        const userProfile = {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio || "",
            location: user.location || "",
            company: user.company || "",
            website: user.website || "",
            githubUrl: user.githubUrl || `https://github.com/${user.username}`,
            followers: user.followers || 0,
            following: user.following || 0,
            publicRepos: user.publicRepos || 0,
            totalStars: user.totalStars || 0,
            totalForks: user.totalForks || 0,
            createdAt: user.createdAt,
            score: userScore,
            rank: userRank,
            highImpactPRs: user.stats?.highImpactPRs || 0,
            contributions: user.stats?.totalMergedPRs || 0,
            languages: user.languages || [],
            repositories: user.repositories || [],
            stats: user.stats || {
                highImpactPRs: 0,
                mediumImpactPRs: 0,
                lowImpactPRs: 0,
                totalMergedPRs: 0
            },
            prs: user.prs || []
        };

        res.status(200).json({
            success: true,
            user: userProfile
        });

    } catch (error) {
        console.error("💥 Error fetching user by username:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user profile",
            error: error.message
        });
    }
};

// -------------------- GET ALL USERS FOR LEADERBOARD --------------------
const getAllUsers = async (req, res) => {
    try {
        console.log('🔍 Fetching all users for leaderboard...');
        
        // Get all users with their PR stats, exclude sensitive information
        const users = await Users.find()
            .select('-password -githubToken -email -__v -updatedAt')
            .sort({ 'stats.totalMergedPRs': -1, 'stats.highImpactPRs': -1 });

        console.log(`✅ Found ${users.length} users for leaderboard`);

        // Calculate scores and prepare leaderboard data
        const leaderboardData = users.map((user, index) => {
            const stats = user.stats || {
                highImpactPRs: 0,
                mediumImpactPRs: 0,
                lowImpactPRs: 0,
                totalMergedPRs: 0
            };

            // Calculate score: High impact = 10, Medium = 5, Low = 2
            const score = (stats.highImpactPRs * 10) + 
                         (stats.mediumImpactPRs * 5) + 
                         (stats.lowImpactPRs * 2);

            return {
                id: user._id.toString(),
                userId: user._id.toString(),
                name: user.name,
                username: user.username,
                avatar: user.avatar,
                score: score,
                prsCount: stats.totalMergedPRs,
                highImpactPRs: stats.highImpactPRs,
                mediumImpactPRs: stats.mediumImpactPRs,
                lowImpactPRs: stats.lowImpactPRs,
                rank: index + 1,
                isVerified: user.isVerified,
                lastUpdated: user.stats?.lastUpdated || user.createdAt
            };
        });

        // Sort by score (descending) and update ranks
        leaderboardData.sort((a, b) => b.score - a.score);
        leaderboardData.forEach((user, index) => {
            user.rank = index + 1;
        });

        console.log('✅ Leaderboard data prepared successfully');

        res.status(200).json({
            success: true,
            users: leaderboardData,
            total: leaderboardData.length,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('💥 Error fetching all users:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard data',
            error: error.message
        });
    }
};

// -------------------- UPDATE USER PROFILE --------------------
const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;

        console.log("📝 Updating user profile:", userId);

        // Remove fields that shouldn't be updated
        const allowedFields = ['name', 'bio', 'location', 'company', 'website', 'githubUrl'];
        const filteredUpdate = {};
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredUpdate[field] = updateData[field];
            }
        });

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            filteredUpdate,
            { new: true, runValidators: true }
        ).select('-password -githubToken -__v');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("💥 Error updating user profile:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message
        });
    }
};

module.exports = {
    getUserByUsername,
    getAllUsers,
    updateUserProfile
};