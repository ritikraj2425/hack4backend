const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['low_pr_10', 'high_pr_1', 'medium_pr_5', 'first_contribution']
    },
    achievedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        prCount: Number,
        prUrls: [String],
        impactType: String
    }
}, {
    timestamps: true
});

achievementSchema.index({ userId: 1, type: 1 }, { unique: true });
module.exports = mongoose.model("Achievement", achievementSchema);
