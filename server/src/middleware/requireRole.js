'use strict';

/**
 * Role-checking middleware factory.
 * Usage: requireRole('supervisor') or requireRole('instructor', 'supervisor')
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = requireRole;
