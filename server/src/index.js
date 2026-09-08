require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Guard: ensure critical env vars are set
if (!MONGO_URI) {
  console.error('[Fatal] MONGO_URI is not defined in environment variables.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('[Fatal] JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] Connected successfully.');

    const server = app.listen(PORT, () => {
      console.log(
        `[Server] Running in ${process.env.NODE_ENV || 'development'} mode on https://psychological-clock-urdu.vercel.app/`
      );
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.log('[MongoDB] Connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[MongoDB] Failed to connect:', err.message);
    process.exit(1);
  }
};

startServer();
