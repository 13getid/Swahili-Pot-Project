'use strict';

// Lightweight system audit trail. Every call is fire-and-forget: a failure to
// write an audit row must never break the action being audited, so errors are
// logged and swallowed.

const pool = require('../db/pool');

/** Best-effort client IP, honouring the nginx X-Forwarded-For header. */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip || null;
}

/**
 * Insert one audit row. `actor` is a user-shaped object ({ id, name, role }),
 * or null for anonymous/system events.
 */
async function recordAudit({ actor, action, targetType, targetId, targetDescription, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (actor_id, actor_name, actor_role, action, target_type, target_id, target_description, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        actor && actor.id ? actor.id : null,
        actor && actor.name ? actor.name : null,
        actor && actor.role ? actor.role : null,
        action,
        targetType || null,
        targetId || null,
        targetDescription || null,
        ip || null,
      ]
    );
  } catch (err) {
    console.error(`[audit] failed to record "${action}": ${err.message}`);
  }
}

/**
 * Fire-and-forget helper for use inside route handlers. Derives the actor and
 * IP from the request and never returns a rejected promise.
 */
function audit(req, action, opts = {}) {
  recordAudit({
    actor: req.user || null,
    action,
    ip: clientIp(req),
    ...opts,
  }).catch(() => {});
}

module.exports = { recordAudit, audit, clientIp };
