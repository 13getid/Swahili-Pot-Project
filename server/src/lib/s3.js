'use strict';

const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Shared S3 client. Credentials and region come from the environment
 * (validated at startup in config/env.js). An optional custom endpoint
 * supports S3-compatible providers (MinIO, Cloudflare R2, etc.).
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  ...(process.env.S3_ENDPOINT
    ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
    : {}),
});

const S3_BUCKET = process.env.S3_BUCKET;

module.exports = { s3, S3_BUCKET };
