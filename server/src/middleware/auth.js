'use strict';

const jwt = require('jsonwebtoken');

/**
 * Reads the JWT from the HttpOnly `token` cookie, verifies it, and attaches
 * req.user = { id, name, email, role, department_id }.
 */
function verifyToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      department_id: payload.department_id,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = verifyToken;
