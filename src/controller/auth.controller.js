require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const Users = require("../models/user.model");

// -------------------- GITHUB OAUTH CALLBACK --------------------
exports.githubCallback = async (req, res) => {
    try {
        console.log("🔵 GitHub OAuth callback started");
        console.log("Query params:", req.query);
        
        const { code } = req.query;
        if (!code) {
            console.error("❌ Missing GitHub code");
            return res.status(400).json({ message: "Missing GitHub code." });
        }

        // Debug environment variables
        console.log("🔍 Environment check:", {
            hasClientId: !!process.env.GITHUB_CLIENT_ID,
            hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
            redirectUri: process.env.GITHUB_REDIRECT_URI,
            frontendUrl: process.env.FRONTEND_URL
        });

        if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
            console.error("❌ Missing GitHub OAuth credentials");
            return res.status(500).json({ 
                message: "Server configuration error: Missing OAuth credentials" 
            });
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

        console.log("✅ Token response:", tokenResponse.data);

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

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET not found");
            return res.status(500).json({ message: "Server configuration error." });
        }

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
        console.error("💥 GitHub callback error:", {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        
        // Redirect to frontend with error
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendURL}?error=auth_failed`);
    }
};

// -------------------- CHECK AUTH --------------------
exports.checkAuth = async (req, res) => {
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

// -------------------- GET USER PROFILE --------------------
exports.getUserProfile = async (req, res) => {
    try {
        const token = req.cookies?.authToken;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Users.findById(decoded.id).select('-password -githubToken');
        
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// -------------------- LOGOUT --------------------
exports.logout = async (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    return res.status(200).json({ message: "Logged out successfully." });
};