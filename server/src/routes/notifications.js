'use strict';

const express = require('express');
const pool = require('../db/pool');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — recent notifications + unread count for current user
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const [list, count] = await Promise.all([
      pool.query(
        `SELECT id, type, title, body, link, is_read, created_at, read_at
           FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [req.user.id, limit]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = false',
        [req.user.id]
      ),
    ]);

    return res.json({ notifications: list.rows, unread: count.rows[0].unread });
  } catch (err) {
    return next(err);
  }
});

// GET /api/notifications/unread-count — lightweight poll endpoint
router.get('/unread-count', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    return res.json({ unread: rows[0].unread });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });

    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, type, title, body, link, is_read, created_at, read_at`,
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Notification not found' });

    return res.json({ notification: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', verifyToken, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
