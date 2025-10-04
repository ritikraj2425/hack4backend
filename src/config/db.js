const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("MongoDB Connected...");
    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
