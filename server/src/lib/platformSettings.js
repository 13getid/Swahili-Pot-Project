'use strict';

// Platform-wide settings are stored as a single JSON row in the existing
// site_settings table under key = 'platform' (reusing the CMS storage rather
// than adding a parallel table). A short in-process cache keeps the
// maintenance-mode middleware from hitting the database on every request.

const pool = require('../db/pool');

const KEY = 'platform';

const DEFAULTS = {
  maintenance_mode: false,
  attendance_expiry_hours: 3,
  max_file_size_mb: 10,
  downtime_escalation_hours: 2,
  org_name: 'Swahilipot Hub Foundation',
  org_email: 'info@swahilipothub.co.ke',
  system_ai_enabled: true,
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 10 * 1000;

async function load(force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < TTL_MS) return cache;
  try {
    const { rows } = await pool.query('SELECT value FROM site_settings WHERE key = $1', [KEY]);
    const stored = rows[0] ? rows[0].value : {};
    cache = { ...DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
  } catch (err) {
    console.error(`[settings] load failed: ${err.message}`);
    cache = cache || { ...DEFAULTS };
  }
  cacheAt = now;
  return cache;
}

/** Get the full settings object (cached). */
async function getSettings() {
  return load();
}

/** Get a single setting by name. */
async function getSetting(name) {
  const s = await load();
  return s[name];
}

/** Merge and persist a partial update, returning the new full object. */
async function setSettings(patch) {
  const current = await load(true);
  const next = { ...current, ...patch };
  await pool.query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [KEY, JSON.stringify(next)]
  );
  cache = next;
  cacheAt = Date.now();
  return next;
}

/** Set a single setting. */
async function setSetting(name, value) {
  return setSettings({ [name]: value });
}

/** Invalidate the cache (e.g. after a direct write). */
function invalidate() {
  cache = null;
  cacheAt = 0;
}

module.exports = { getSettings, getSetting, setSettings, setSetting, invalidate, DEFAULTS };
