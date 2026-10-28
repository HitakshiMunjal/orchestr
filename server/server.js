require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const apiRoutes = require("./routes/apiRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Campus Engine API" });
});

app.use("/api", apiRoutes);

// Centralized Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5050;

async function start() {
  // Connect to MongoDB before accepting traffic (also detects transaction support)
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Campus Engine Server running on http://localhost:${PORT}`);
  });
}

start();
