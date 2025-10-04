require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require('./routes/user.routes');


const app = express();

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey", "jwttoken", "refreshtoken"],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/auth", authRoutes);
app.use('/auth', userRoutes);

// Test route
app.get("/", (req, res) => res.send("Server is running!"));

module.exports = app;
