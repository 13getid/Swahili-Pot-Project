'use strict';

const express = require('express');
const pool = require('../db/pool');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// GET /api/departments
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, has_trainees, has_radio_report, created_at
         FROM departments
        ORDER BY name`
    );
    return res.json({ departments: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
