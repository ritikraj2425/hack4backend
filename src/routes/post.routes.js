const express = require("express");
const { getAllPosts, createPost, getUserPosts } = require("../controller/post.controller");

const router = express.Router();

router.get("/", getAllPosts);
router.post("/", createPost);
router.get("/user/:userId", getUserPosts);

module.exports = router;
