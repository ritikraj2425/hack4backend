require('dotenv').config();
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.REFRESH_SECRET;

class Verification {
    // Generate JWT (3 days)
    static generateJwt(payload) {
        return jwt.sign(payload, jwtSecret, { expiresIn: "3d" });
    }

    // Generate Refresh Token (7 days)
    static generateRefreshToken(payload) {
        return jwt.sign(payload, refreshSecret, { expiresIn: "7d" });
    }

    // Verify a token (JWT or Refresh)
    static tokenVerification(token, type = "jwt") {
        const secret = type === "jwt" ? jwtSecret : refreshSecret;
        try {
            const payload = jwt.verify(token, secret);
            return payload;
        } catch (err) {
            return false;
        }
    }

    // Standard payload to return to frontend
    static updatePayload(payload) {
        return {
            id: payload.id,   // MongoDB user _id
            name: payload.name,
            email: payload.email
        };
    }

    // Verify JWT + Refresh Token and optionally renew
    static verifyJwt(jwtToken, refreshToken) {
        const jwtPayload = this.tokenVerification(jwtToken, "jwt");
        const refreshPayload = this.tokenVerification(refreshToken, "refresh");

        // Both valid
        if (jwtPayload && refreshPayload) {
            return {
                message: "valid user",
                credentials: {
                    payload: this.updatePayload(jwtPayload),
                    jwtToken,
                    refreshToken
                }
            };
        }

        // JWT expired but refresh valid → issue new JWT
        if (!jwtPayload && refreshPayload) {
            const newPayload = {
                id: refreshPayload.id,
                name: refreshPayload.name,
                email: refreshPayload.email
            };
            const newJwtToken = this.generateJwt(newPayload);
            return {
                message: "valid user",
                credentials: {
                    payload: this.updatePayload(refreshPayload),
                    jwtToken: newJwtToken,
                    refreshToken
                }
            };
        }

        // JWT valid but refresh expired → issue new refresh token
        if (jwtPayload && !refreshPayload) {
            const newPayload = {
                id: jwtPayload.id,
                name: jwtPayload.name,
                email: jwtPayload.email
            };
            const newRefreshToken = this.generateRefreshToken(newPayload);
            return {
                message: "valid user",
                credentials: {
                    payload: this.updatePayload(jwtPayload),
                    jwtToken,
                    refreshToken: newRefreshToken
                }
            };
        }

        // Both invalid
        return false;
    }
}

module.exports = Verification;
