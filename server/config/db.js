const mongoose = require("mongoose");
const { detectTransactionSupport } = require("./transactions");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_engine";
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    const txn = await detectTransactionSupport();
    console.log(
      txn
        ? "MongoDB transactions: ENABLED (replica set detected)"
        : "MongoDB transactions: standalone server — using atomic single-document fallback"
    );
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
