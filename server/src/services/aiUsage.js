'use strict';

// Records one AI feature invocation for the system-admin usage dashboard.
// Best-effort: a logging failure must never break the AI request itself.

const pool = require('../db/pool');

async function logAIUsage({
  user_id,
  department_id,
  feature,
  tokens_used,
  duration_ms,
  success,
  error_message,
}) {
  try {
    await pool.query(
      `INSERT INTO ai_usage_log
         (user_id, department_id, feature, tokens_used, duration_ms, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_id || null,
        department_id || null,
        feature,
        tokens_used || null,
        duration_ms || null,
        success !== false,
        error_message ? String(error_message).slice(0, 500) : null,
      ]
    );
  } catch (err) {
    console.error(`[ai-usage] log write failed (${feature}): ${err.message}`);
  }
}

module.exports = logAIUsage;
