'use strict';

// When platform maintenance mode is on, every API call is rejected with 503
// EXCEPT: health checks, the auth endpoints (so admins can still sign in), and
// any request made by an admin. The client turns the 503 into a maintenance
// screen.

const jwt = require('jsonwebtoken');
const { getSettings } = require('../lib/platformSettings');

// Paths that must keep working during maintenance (prefix match).
const ALLOW_PREFIXES = ['/api/health', '/api/auth'];

function isAdminRequest(req) {
  try {
    const tok = req.cookies && req.cookies.token;
    if (!tok) return false;
    const claims = jwt.verify(tok, process.env.JWT_SECRET);
    return claims && claims.role === 'admin';
  } catch {
    return false;
  }
}

async function maintenanceGuard(req, res, next) {
  try {
    // Only guard API traffic; everything else falls through.
    if (!req.path.startsWith('/api/')) return next();
    if (ALLOW_PREFIXES.some((p) => req.path.startsWith(p))) return next();

    const settings = await getSettings();
    if (!settings.maintenance_mode) return next();
    if (isAdminRequest(req)) return next();

    return res.status(503).json({
      error: settings.maintenance_message || 'The system is undergoing maintenance. Please check back shortly.',
      maintenance: true,
    });
  } catch (err) {
    // Never let the guard itself take the site down.
    return next();
  }
}

module.exports = maintenanceGuard;
