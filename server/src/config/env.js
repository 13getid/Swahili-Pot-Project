'use strict';

const { z } = require('zod');

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((v) => parseInt(v, 10))
    .refine((v) => !Number.isNaN(v) && v > 0, 'PORT must be a positive integer'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  // S3 (or S3-compatible) storage for uploaded files
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  // Optional: custom endpoint for S3-compatible providers (R2, MinIO, ...)
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL').optional(),
  // SMTP for password-reset emails. Optional: if unset, reset links are logged
  // to the server console (dev fallback) instead of being emailed.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Intentional: startup-time fatal logging before the app boots.
    console.error('Invalid environment configuration:\n' + issues);
    process.exit(1);
  }
  return parsed.data;
}

module.exports = { loadEnv };
