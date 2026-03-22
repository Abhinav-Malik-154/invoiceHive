import {PORT,NODE_ENV} from "../src/config/env.js" // Must be first — loads .env before anything else
import app from "./app.js";
import { connectDB } from "./config/db.js";
import redis from "./config/redis.js";

const port = PORT || 3001;


const start = async () => {
  // Connect to MongoDB and Redis before starting the server
  await connectDB();

  // Redis connects automatically via ioredis, but we ping to confirm
  await redis.ping();

  app.listen(port, () => {
    console.log(`\n Auth Service running on port ${port}`);
    console.log(`   ENV: ${NODE_ENV || "development"}`);
    console.log(`   Health: http://localhost:${port}/health\n`);
  });
};

// Graceful shutdown — clean up connections on SIGTERM (Docker stop)
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// Catch unhandled promise rejections — log and exit
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

start();