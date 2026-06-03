'use strict';

const { S3Client } = require('@aws-sdk/client-s3');

const S3_BUCKET = process.env.S3_BUCKET;

let _client = null;

/**
 * Lazily construct the S3 client only when the S3 storage driver is actually
 * used, so a misconfigured/blank AWS setup never breaks local-disk uploads.
 */
function getS3() {
  if (_client) return _client;
  _client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  return _client;
}

function hasS3Creds() {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.AWS_REGION || process.env.S3_ENDPOINT)
  );
}

/**
 * Decide the active storage driver:
 *   STORAGE_DRIVER=s3     -> always S3
 *   STORAGE_DRIVER=local  -> always local disk
 *   (unset)               -> S3 when credentials are present, else local
 * This means "if the env has S3 creds, uploads go to S3".
 */
function isS3() {
  const driver = process.env.STORAGE_DRIVER;
  if (driver === 's3') return true;
  if (driver === 'local') return false;
  return hasS3Creds();
}

module.exports = { getS3, isS3, hasS3Creds, S3_BUCKET };
