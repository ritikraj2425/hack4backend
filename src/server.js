require("dotenv").config();
const http = require("http");
const app = require("./index"); // import the app from index.js
const connectDB = require("./config/db"); // your mongoose connection
const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        const server = http.createServer(app);
        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("DB connection failed:", err);
        process.exit(1);
    });
