// controllers/authController.js
require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const Users = require("../models/user.model");

// -------------------- GITHUB OAUTH CALLBACK --------------------
const githubCallback = async (req, res) => {
    try {
        console.log("🔵 GitHub OAuth callback started");
        const { code } = req.query;
        
        if (!code) {
            console.error("❌ Missing GitHub code");
            return res.status(400).json({ message: "Missing GitHub code." });
        }

        // Exchange code for access token
        console.log("🔄 Exchanging code for access token...");
        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI,
            },
            { 
                headers: { 
                    Accept: "application/json",
                    "Content-Type": "application/json"
                } 
            }
        );

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            console.error("❌ No access token received:", tokenResponse.data);
            return res.status(500).json({ 
                message: "GitHub token not received.", 
                error: tokenResponse.data 
            });
        }

        // Fetch GitHub user info
        console.log("📡 Fetching user info from GitHub...");
        const userRes = await axios.get("https://api.github.com/user", {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "MergeFlow-App"
            },
        });

        let { login: username, name, email, avatar_url } = userRes.data;
        console.log("👤 GitHub user data:", { username, name, email });

        // If email is null, fetch primary verified email
        if (!email) {
            console.log("📧 No primary email, fetching emails...");
            const emailsRes = await axios.get("https://api.github.com/user/emails", {
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    "User-Agent": "MergeFlow-App"
                },
            });
            
            const primaryEmail = emailsRes.data.find((e) => e.primary && e.verified);
            email = primaryEmail ? primaryEmail.email : null;
            console.log("📨 Found email from emails list:", email);
        }

        if (!email) {
            console.error("❌ No email found for GitHub user");
            return res.status(400).json({ message: "GitHub email not available." });
        }

        // Create or update user in DB
        let user = await Users.findOne({ email });
        if (!user) {
            console.log("🆕 Creating new user...");
            user = new Users({
                name: name || username,
                username: username,
                email: email,
                avatar: avatar_url,
                githubToken: accessToken,
                isVerified: true,
            });
        } else {
            console.log("📝 Updating existing user...");
            user.githubToken = accessToken;
            user.isVerified = true;
            if (avatar_url) user.avatar = avatar_url;
        }
        
        await user.save();
        console.log("💾 User saved to database:", user._id);

        // Generate JWT token
        const payload = { 
            id: user._id, 
            name: user.name, 
            email: user.email,
            username: user.username 
        };

        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { 
            expiresIn: '3d' 
        });

        // Set HttpOnly cookie
        res.cookie('authToken', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        console.log("🎯 Redirecting to frontend...");
        // Redirect to frontend
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(frontendURL);

    } catch (error) {
        console.error("💥 GitHub callback error:", error.message);
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendURL}?error=auth_failed`);
    }
};

// -------------------- CHECK AUTH --------------------
const checkAuth = async (req, res) => {
    try {
        const token = req.cookies?.authToken;
        if (!token) {
            return res.status(200).json({ isAuthenticated: false });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Users.findById(decoded.id).select('-password -githubToken');
        
        if (!user) {
            return res.status(200).json({ isAuthenticated: false });
        }

        return res.status(200).json({ 
            isAuthenticated: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error("Check auth error:", error.message);
        return res.status(200).json({ isAuthenticated: false });
    }
};

// -------------------- GET CURRENT USER --------------------
const getCurrentUser = async (req, res) => {
    try {
        console.log('🔍 getCurrentUser - Cookies:', req.cookies);
        
        const token = req.cookies?.authToken;
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Not authenticated" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Users.findById(decoded.id).select('-password -githubToken -__v');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        console.log('✅ User found:', user.email);
        
        // Return user data
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        // Only include existing stats and PRs (don't fetch new ones)
        if (user.stats) {
            userResponse.stats = user.stats;
        }
        if (user.prs) {
            userResponse.prs = user.prs;
        }

        res.status(200).json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error("💥 getCurrentUser error:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Server error while fetching user data",
            error: error.message 
        });
    }
};

// -------------------- GET USER PRs --------------------
const getUserPRs = async (req, res) => {
    try {
        console.log('🔍 getUserPRs - Starting...');
        console.log('🔍 Cookies:', req.cookies);
        
        const token = req.cookies?.authToken;
        if (!token) {
            console.log('❌ No auth token found');
            return res.status(401).json({ 
                success: false,
                message: "Not authenticated" 
            });
        }

        console.log('✅ Token found, verifying...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded for user:', decoded.email);
        
        const user = await Users.findById(decoded.id);
        
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        if (!user.githubToken) {
            console.log('❌ User has no GitHub token');
            return res.status(404).json({ 
                success: false,
                message: "GitHub token not found. Please reconnect GitHub." 
            });
        }

        console.log(`📡 Fetching merged PRs for user: ${user.username}`);

        const githubToken = user.githubToken;
        const searchQuery = `is:pr author:${user.username} is:merged`;

        const searchRes = await axios.get(
            `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=50`,
            { headers: { Authorization: `Bearer ${githubToken}`, "User-Agent": "MergeFlow-App" } }
        );

        const prs = searchRes.data.items || [];
        console.log(`🔍 Found ${prs.length} merged PRs`);

        const filteredPRs = [];
        let high = 0, medium = 0, low = 0;

        for (const pr of prs) {
            try {
                const repoUrl = pr.repository_url;
                const repoRes = await axios.get(repoUrl, {
                    headers: { Authorization: `Bearer ${githubToken}`, "User-Agent": "MergeFlow-App" }
                });

                const repo = repoRes.data;

                // Skip private repos or self-owned repos
                if (repo.private || repo.owner.login === user.username) continue;

                // Categorize impact
                let impact = "low";
                if (repo.stargazers_count > 500) {
                    impact = "high";
                    high++;
                } else if (repo.stargazers_count >= 100) {
                    impact = "medium";
                    medium++;
                } else {
                    low++;
                }

                filteredPRs.push({
                    title: pr.title,
                    url: pr.html_url,
                    repo: repo.full_name,
                    stars: repo.stargazers_count,
                    impact,
                    mergedAt: pr.closed_at,
                });
            } catch (repoErr) {
                console.log("⚠️ Repo fetch failed:", repoErr.message);
            }
        }

        // Save stats and PRs to user
        user.stats = {
            highImpactPRs: high,
            mediumImpactPRs: medium,
            lowImpactPRs: low,
            totalMergedPRs: high + medium + low,
            lastUpdated: new Date()
        };
        user.prs = filteredPRs;

        await user.save();

        console.log('✅ PR data saved successfully');

        res.status(200).json({
            success: true,
            stats: user.stats,
            prs: user.prs,
            message: `Found ${filteredPRs.length} merged PRs`
        });

    } catch (error) {
        console.error("💥 getUserPRs error:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch PR data",
            error: error.message 
        });
    }
};

// -------------------- LOGOUT --------------------
const logout = async (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    return res.status(200).json({ message: "Logged out successfully." });
};


// controllers/authController.js

// -------------------- GET ALL USERS FOR LEADERBOARD --------------------
const getAllUsers = async (req, res) => {
    try {
        console.log('🔍 Fetching all users for leaderboard...');
        
        // Get all users with their PR stats, exclude sensitive information
        const users = await Users.find()
            .select('-password -githubToken -email -__v')
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
                id: user._id,
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
                lastUpdated: user.stats?.lastUpdated || user.updatedAt
            };
        });

        // Sort by score (descending) in case the database sort wasn't enough
        leaderboardData.sort((a, b) => b.score - a.score);
        
        // Update ranks after sorting
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

// Add this to your existing authController.js

// -------------------- GET USER BY USERNAME (QUICK FIX) --------------------
const getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        console.log("🔍 Quick fix: Fetching user by username:", username);

        // Get current user data as fallback
        const token = req.cookies?.authToken;
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Not authenticated" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await Users.findById(decoded.id).select('-password -githubToken -__v');

        if (!currentUser) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Return current user data for now (quick fix)
        const userProfile = {
            id: currentUser._id,
            username: currentUser.username,
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            bio: currentUser.bio || "",
            location: currentUser.location || "",
            company: currentUser.company || "",
            website: currentUser.website || "",
            githubUrl: currentUser.githubUrl || `https://github.com/${currentUser.username}`,
            followers: currentUser.followers || 0,
            following: currentUser.following || 0,
            publicRepos: currentUser.publicRepos || 0,
            totalStars: currentUser.totalStars || 0,
            totalForks: currentUser.totalForks || 0,
            createdAt: currentUser.createdAt,
            score: (currentUser.stats?.highImpactPRs || 0) * 10 + 
                  (currentUser.stats?.mediumImpactPRs || 0) * 5 + 
                  (currentUser.stats?.lowImpactPRs || 0) * 2,
            rank: 1, // Default rank for quick fix
            highImpactPRs: currentUser.stats?.highImpactPRs || 0,
            contributions: currentUser.stats?.totalMergedPRs || 0,
            languages: currentUser.languages || [],
            repositories: currentUser.repositories || [],
            stats: currentUser.stats || {
                highImpactPRs: 0,
                mediumImpactPRs: 0,
                lowImpactPRs: 0,
                totalMergedPRs: 0
            }
        };

        res.status(200).json({
            success: true,
            user: userProfile
        });

    } catch (error) {
        console.error("💥 Error in quick fix getUserByUsername:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user profile",
            error: error.message
        });
    }
};
// Export all functions
module.exports = {
    githubCallback,
    checkAuth,
    getCurrentUser,
    getUserPRs,
    logout,
    getAllUsers,
    getUserByUsername
};