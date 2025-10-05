require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const achievementRoutes = require("./routes/achievements.routes")
const agentRoutes = require("./routes/agent.routes");

const app = express();

const corsOptions = {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey", "jwttoken", "refreshtoken"],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use("/api/agent", agentRoutes);
app.use("/api/achievement", achievementRoutes)
app.use("/auth", authRoutes);
app.use('/api/posts', postRoutes);


// Test route
app.get("/", (req, res) => res.send("Server is running!"));

module.exports = app;
