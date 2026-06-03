'use strict';

const express = require('express');
const pool = require('../db/pool');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

const KENYAN_PHONE_RE = /^0(7|1)\d{8}$/;

// GET /api/trainees — instructor only, own department
router.get('/', verifyToken, requireRole('instructor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, department_id, added_by, is_active, created_at
         FROM trainees
        WHERE department_id = $1
        ORDER BY name`,
      [req.user.department_id]
    );
    return res.json({ trainees: rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/trainees — instructor only
router.post('/', verifyToken, requireRole('instructor'), async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone is required' });
    if (!KENYAN_PHONE_RE.test(phone.trim())) {
      return res.status(400).json({ error: 'Phone must be a valid Kenyan number (e.g. 07XXXXXXXX or 01XXXXXXXX)' });
    }

    const { rows } = await pool.query(
      `INSERT INTO trainees (name, phone, department_id, added_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, department_id, added_by, is_active, created_at`,
      [name.trim(), phone.trim(), req.user.department_id, req.user.id]
    );

    return res.status(201).json({ trainee: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/trainees/:id — soft delete, same department only
router.delete('/:id', verifyToken, requireRole('instructor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid trainee id' });

    const { rows } = await pool.query(
      `UPDATE trainees
          SET is_active = false
        WHERE id = $1 AND department_id = $2
        RETURNING id, name, phone, department_id, added_by, is_active, created_at`,
      [id, req.user.department_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trainee not found in your department' });
    }

    return res.json({ trainee: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
