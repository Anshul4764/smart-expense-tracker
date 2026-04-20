
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const financeRoutes = require("./routes/finance");
const portfolioRoutes = require("./routes/portfolio");

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_expense_tracker";

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Smart Expense Tracker backend is running" });
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "smart-expense-tracker-backend",
    timestamp: new Date().toISOString()
  });
});
app.use("/api/finance", financeRoutes);
app.use("/api/portfolio", portfolioRoutes);

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

start();
