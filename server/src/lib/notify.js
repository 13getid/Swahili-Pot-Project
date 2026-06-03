'use strict';

const pool = require('../db/pool');

/**
 * Create a single notification for a user.
 * Accepts an optional pg client (to run inside an existing transaction);
 * defaults to the shared pool.
 */
async function notifyUser(
  { userId, type, title, body = null, link = null },
  db = pool
) {
  if (!userId) return;
  await db.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, link]
  );
}

/**
 * Notify every active supervisor in a department.
 */
async function notifyDepartmentSupervisors(
  { departmentId, type, title, body = null, link = null },
  db = pool
) {
  if (!departmentId) return;
  const { rows } = await db.query(
    `SELECT id FROM users
      WHERE role = 'supervisor' AND department_id = $1 AND is_active = true`,
    [departmentId]
  );
  for (const row of rows) {
    await notifyUser({ userId: row.id, type, title, body, link }, db);
  }
}

module.exports = { notifyUser, notifyDepartmentSupervisors };
