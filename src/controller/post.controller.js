const Post = require("../models/post.model");

// -------------------- GET ALL POSTS WITH PAGINATION --------------------
const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPosts = await Post.countDocuments();

        res.status(200).json({
            success: true,
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                hasNext: page < Math.ceil(totalPosts / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error("💥 Error fetching posts:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch posts",
            error: error.message
        });
    }
};

// -------------------- CREATE A NEW POST --------------------
const createPost = async (req, res) => {
    try {
        const { content, userId, userName, userAvatar, userUsername } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: "Post content is required" });
        }

        if (content.length > 500) {
            return res.status(400).json({ success: false, message: "Post content cannot exceed 500 characters" });
        }

        if (!userId || !userName || !userUsername) {
            return res.status(400).json({ success: false, message: "User information is required" });
        }

        const newPost = new Post({
            userId,
            userName,
            userAvatar: userAvatar || "/placeholder.svg",
            userUsername,
            content: content.trim(),
            likes: 0,
            comments: 0,
            shares: 0
        });

        const savedPost = await newPost.save();

        res.status(201).json({
            success: true,
            post: {
                id: savedPost._id.toString(),
                userId: savedPost.userId,
                content: savedPost.content,
                createdAt: savedPost.createdAt.toISOString(), // Use createdAt instead of timestamp
                likes: savedPost.likes,
                comments: savedPost.comments,
                shares: savedPost.shares,
                user: {
                    name: savedPost.userName,
                    avatar: savedPost.userAvatar,
                    username: savedPost.userUsername
                }
            }
        });
    } catch (error) {
        console.error("💥 Error creating post:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to create post",
            error: error.message
        });
    }
};

// -------------------- GET POSTS BY SPECIFIC USER --------------------
const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPosts = await Post.countDocuments({ userId });

        res.status(200).json({
            success: true,
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                hasNext: page < Math.ceil(totalPosts / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error("💥 Error fetching user posts:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user posts",
            error: error.message
        });
    }
};

// -------------------- EXPORT ALL CONTROLLERS --------------------
module.exports = {
    getAllPosts,
    createPost,
    getUserPosts
};
