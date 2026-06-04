'use strict';

// override:true makes the .env file authoritative — so edits always take
// effect on restart even if a process manager (pm2) cached an older value.
require('dotenv').config({ override: true });

const { loadEnv } = require('./src/config/env');
const { checkS3 } = require('./src/lib/s3');

// 1. Validate environment — crashes the process if anything required is missing.
const env = loadEnv();

const app = require('./src/app');
const migrate = require('./src/db/migrate');

async function start() {
  // 2. Ensure database tables exist.
  await migrate();

  // 3. Verify file storage so misconfiguration shows up clearly in the logs.
  await checkS3();

  // 4. Start the server.
  app.listen(env.PORT, () => {
    console.log(`SwahiliPot IMS server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
