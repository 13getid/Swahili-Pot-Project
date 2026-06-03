'use strict';

require('dotenv').config();

const { loadEnv } = require('./src/config/env');

// 1. Validate environment — crashes the process if anything required is missing.
const env = loadEnv();

const app = require('./src/app');
const migrate = require('./src/db/migrate');

async function start() {
  // 2. Ensure database tables exist.
  await migrate();

  // 3. Start the server.
  app.listen(env.PORT, () => {
    console.log(`SwahiliPot IMS server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
