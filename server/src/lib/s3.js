'use strict';

const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

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

/**
 * Startup connectivity check. Logs a clear, actionable line so a
 * misconfigured bucket/region/credentials is obvious in `pm2 logs`.
 */
async function checkS3() {
  if (!isS3()) {
    console.log('[storage] Using LOCAL disk for uploads (set STORAGE_DRIVER=s3 to use S3).');
    return;
  }
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !region) {
    console.error('[storage] STORAGE_DRIVER=s3 but AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET are not all set.');
    return;
  }
  try {
    await getS3().send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[storage] S3 OK — uploads go to bucket "${bucket}" (${region}).`);
  } catch (err) {
    const code = err.name || err.Code || err.code || 'unknown';
    console.error(
      `[storage] S3 NOT reachable for bucket "${bucket}" (${region}): ${code} — ${err.message}. ` +
        'Uploads will fail. Check AWS_REGION matches the bucket region, the bucket name, and the credentials.'
    );
  }
}

module.exports = { getS3, isS3, hasS3Creds, checkS3, S3_BUCKET };
