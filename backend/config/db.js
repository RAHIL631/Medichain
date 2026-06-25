// medichain/backend/config/db.js
// MongoDB connection with reconnection logic and graceful disconnect handling.

const mongoose = require('mongoose');

// ── Connection options ────────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,  // Fail fast if Mongo is unreachable on startup
  socketTimeoutMS:         45000,  // Close idle sockets after 45s
  maxPoolSize:             10,     // Max simultaneous connections in the pool
};

// ── connectDB ─────────────────────────────────────────────────────────────────
/**
 * Establishes the Mongoose connection.
 * Called once at server startup in server.js.
 * Mongoose automatically manages reconnection after the initial connection.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    // Exit the process — nodemon/PM2 will restart it, retrying the connection
    process.exit(1);
  }
};

// ── Connection event listeners ────────────────────────────────────────────────

// Fires when Mongoose loses connection after a successful initial connect
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — Mongoose will attempt to reconnect...');
});

// Fires when Mongoose successfully reconnects after a disconnection
mongoose.connection.on('reconnected', () => {
  console.log('✅  MongoDB reconnected');
});

// Fires on any connection error after the initial connect
mongoose.connection.on('error', (err) => {
  console.error(`❌  MongoDB runtime error: ${err.message}`);
});

// ── Graceful disconnect on process termination ────────────────────────────────
// Ensures the connection pool is drained cleanly when the server shuts down.
// Works with SIGINT (Ctrl+C in development) and SIGTERM (Docker/PM2 stop).
const gracefulDisconnect = async (signal) => {
  console.log(`\n⚠️  ${signal} received — closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('✅  MongoDB connection closed cleanly');
  process.exit(0);
};

process.on('SIGINT',  () => gracefulDisconnect('SIGINT'));
process.on('SIGTERM', () => gracefulDisconnect('SIGTERM'));

module.exports = connectDB;
