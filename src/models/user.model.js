const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String },        // GitHub username
  email: { type: String, required: true, unique: true },
  githubToken: { type: String },     // GitHub access token
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // Add other fields if needed (e.g., avatar, achievements, leaderboard stats)
});

module.exports = mongoose.model("MilestoneUser", userSchema);
