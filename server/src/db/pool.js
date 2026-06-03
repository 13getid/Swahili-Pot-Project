'use strict';

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || '';

// Enable TLS for managed providers (e.g. Neon) that require sslmode=require.
const needsSsl = /sslmode=require/i.test(connectionString) || /\.neon\.tech/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Unexpected PG pool error:`, err.message);
});

module.exports = pool;
