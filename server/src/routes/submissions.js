'use strict';

const express = require('express');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const pool = require('../db/pool');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const { s3, S3_BUCKET } = require('../lib/s3');
const { notifyUser, notifyDepartmentSupervisors } = require('../lib/notify');

const router = express.Router();

const FORM_TYPES = [
  'Learner Onboarding Form',
  'Session Outline',
  'Progress Report',
  'General Submission',
];

// GET /api/submissions — role-aware
router.get('/', verifyToken, async (req, res, next) => {
  try {
    if (req.user.role === 'instructor') {
      const { rows } = await pool.query(
        `SELECT id, instructor_id, department_id, form_type, title, description,
                file_url, file_original_name, status, supervisor_note,
                submitted_at, acknowledged_at, acknowledged_by
           FROM form_submissions
          WHERE instructor_id = $1
          ORDER BY submitted_at DESC`,
        [req.user.id]
      );
      return res.json({ submissions: rows });
    }

    // supervisor
    const { rows } = await pool.query(
      `SELECT fs.id, fs.instructor_id, fs.department_id, fs.form_type, fs.title, fs.description,
              fs.file_url, fs.file_original_name, fs.status, fs.supervisor_note,
              fs.submitted_at, fs.acknowledged_at, fs.acknowledged_by,
              u.name AS instructor_name
         FROM form_submissions fs
         JOIN users u ON u.id = fs.instructor_id
        WHERE fs.department_id = $1
        ORDER BY fs.submitted_at DESC`,
      [req.user.department_id]
    );
    return res.json({ submissions: rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/submissions — instructor only, optional file under field "attachment"
router.post(
  '/',
  verifyToken,
  requireRole('instructor'),
  upload.single('attachment'),
  async (req, res, next) => {
    try {
      const { title, form_type, description } = req.body || {};

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!form_type || !form_type.trim()) {
        return res.status(400).json({ error: 'Form type is required' });
      }
      if (!FORM_TYPES.includes(form_type.trim())) {
        return res.status(400).json({ error: 'Invalid form type' });
      }

      let fileUrl = null;
      let fileOriginalName = null;
      if (req.file) {
        // multer-s3 puts the object key on req.file.key
        fileUrl = req.file.key;
        fileOriginalName = req.file.originalname;
      }

      const { rows } = await pool.query(
        `INSERT INTO form_submissions
           (instructor_id, department_id, form_type, title, description, file_url, file_original_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, instructor_id, department_id, form_type, title, description,
                   file_url, file_original_name, status, supervisor_note,
                   submitted_at, acknowledged_at, acknowledged_by`,
        [
          req.user.id,
          req.user.department_id,
          form_type.trim(),
          title.trim(),
          description && description.trim() ? description.trim() : null,
          fileUrl,
          fileOriginalName,
        ]
      );

      const submission = rows[0];
      // Notify the department's supervisor(s) that a submission was filed.
      await notifyDepartmentSupervisors({
        departmentId: req.user.department_id,
        type: 'submission_filed',
        title: 'New submission to review',
        body: `${req.user.name} filed "${submission.title}".`,
        link: '/submissions',
      });

      return res.status(201).json({ submission });
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /api/submissions/:id/acknowledge — supervisor only, own department
router.patch('/:id/acknowledge', verifyToken, requireRole('supervisor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid submission id' });

    const { supervisor_note } = req.body || {};
    const note = supervisor_note && supervisor_note.trim() ? supervisor_note.trim() : null;

    const { rows } = await pool.query(
      `UPDATE form_submissions
          SET status = 'acknowledged', acknowledged_at = NOW(),
              acknowledged_by = $2, supervisor_note = $3
        WHERE id = $1 AND department_id = $4
        RETURNING id, instructor_id, department_id, form_type, title, description,
                  file_url, file_original_name, status, supervisor_note,
                  submitted_at, acknowledged_at, acknowledged_by`,
      [id, req.user.id, note, req.user.department_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found in your department' });
    }

    const submission = rows[0];
    await notifyUser({
      userId: submission.instructor_id,
      type: 'submission_acknowledged',
      title: 'Submission acknowledged',
      body: `Your submission "${submission.title}" was acknowledged.`,
      link: '/submissions',
    });

    return res.json({ submission });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/submissions/:id/return — supervisor only, note required
router.patch('/:id/return', verifyToken, requireRole('supervisor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid submission id' });

    const { supervisor_note } = req.body || {};
    if (!supervisor_note || !supervisor_note.trim()) {
      return res.status(400).json({ error: 'A note explaining the return is required' });
    }

    const { rows } = await pool.query(
      `UPDATE form_submissions
          SET status = 'returned', supervisor_note = $2,
              acknowledged_at = NOW(), acknowledged_by = $3
        WHERE id = $1 AND department_id = $4
        RETURNING id, instructor_id, department_id, form_type, title, description,
                  file_url, file_original_name, status, supervisor_note,
                  submitted_at, acknowledged_at, acknowledged_by`,
      [id, supervisor_note.trim(), req.user.id, req.user.department_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found in your department' });
    }

    const submission = rows[0];
    await notifyUser({
      userId: submission.instructor_id,
      type: 'submission_returned',
      title: 'Submission returned',
      body: `Your submission "${submission.title}" was returned. ${submission.supervisor_note || ''}`.trim(),
      link: '/submissions',
    });

    return res.json({ submission });
  } catch (err) {
    return next(err);
  }
});

// GET /api/submissions/:id/file — serve file, same department only
router.get('/:id/file', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid submission id' });

    const { rows } = await pool.query(
      `SELECT file_url, file_original_name, department_id
         FROM form_submissions
        WHERE id = $1`,
      [id]
    );

    const submission = rows[0];
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (submission.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!submission.file_url) {
      return res.status(404).json({ error: 'No file attached to this submission' });
    }

    // Stream the object from S3 through the server so the department check
    // above stays enforced (we never hand the client a direct bucket URL).
    let s3Object;
    try {
      s3Object = await s3.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: submission.file_url })
      );
    } catch (s3Err) {
      if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({ error: 'File no longer exists in storage' });
      }
      throw s3Err;
    }

    const downloadName = submission.file_original_name || 'attachment';
    res.setHeader(
      'Content-Type',
      s3Object.ContentType || 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(downloadName)}"`
    );
    if (s3Object.ContentLength != null) {
      res.setHeader('Content-Length', s3Object.ContentLength);
    }

    // In the AWS SDK v3 (Node), Body is a Readable stream.
    s3Object.Body.on('error', next);
    return s3Object.Body.pipe(res);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
