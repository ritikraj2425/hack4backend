const jwt = require("jsonwebtoken");
const Verification = require("../services/jsonWebToken");
const secretApiKey = process.env.API_KEY;

// Check API Key middleware
const checkForApiKey = (req, res, next) => {
    const { apikey } = req.headers;
    if (!apikey) {
        return res.status(404).json({ message: "API key not found" });
    }
    if (apikey !== secretApiKey) {
        return res.status(400).json({ message: "Invalid API key" });
    }
    next();
};

// Verify JWT middleware (from cookie or header)
const verifyJWT = (req, res, next) => {
    // Get token from cookie
    const token = req.cookies?.authToken || req.headers?.jwttoken;
    const refreshToken = req.headers?.refreshtoken;

    if (!token) {
        return res.status(401).json({ message: "You are not authorized to access this API" });
    }

    const check = Verification.verifyJwt(token, refreshToken);
    if (!check) {
        return res.status(401).json({ message: "You are not authorized to access this API" });
    }

    // Add user info to request for downstream usage
    req.user = check;
    next();
};

module.exports = { checkForApiKey, verifyJWT };
