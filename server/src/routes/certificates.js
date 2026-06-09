'use strict';

const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

const BRAND = '#1e40af';
const INK = '#374151';
const MUTED = '#6b7280';

const TYPES = ['attachment_letter', 'completion_certificate'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Format a YYYY-MM-DD (or ISO) string as "dd Month yyyy" without TZ surprises.
function longDate(value) {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (m) {
    return `${m[3]} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function drawHeader(doc) {
  const top = doc.y;
  // Logo (text based)
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(20).text('SwahiliPot', { continued: true });
  doc.fillColor(INK).font('Helvetica').fontSize(14).text(' Hub Foundation');
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text('Swahili Cultural Centre, Sir Mbarak Hinaway Rd, Old Town, Mombasa');
  doc.text('swahilipothub.co.ke | info@swahilipothub.co.ke');

  // Right-aligned generation date
  doc
    .fillColor(INK)
    .fontSize(10)
    .text(longDate(new Date().toISOString()), 72, top, { align: 'right' });

  doc.moveDown(1);
  const y = doc.y;
  doc.strokeColor(BRAND).lineWidth(1).moveTo(72, y).lineTo(doc.page.width - 72, y).stroke();
  doc.moveDown(1.5);
}

function drawFooter(doc, supervisorName, supervisorTitle) {
  const bottom = doc.page.height - 130;
  doc.y = bottom;
  doc.strokeColor('#9ca3af').lineWidth(1).moveTo(72, doc.y).lineTo(72 + 150, doc.y).stroke();
  doc.moveDown(0.4);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(supervisorName, 72, doc.y);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(supervisorTitle);
  doc
    .fontSize(10)
    .fillColor(INK)
    .text('Swahilipot Hub Foundation, Mombasa', 72, doc.y - 24, { align: 'right' });

  const lineY = doc.page.height - 60;
  doc.strokeColor(BRAND).lineWidth(1).moveTo(72, lineY).lineTo(doc.page.width - 72, lineY).stroke();
}

function attachmentLetterBody(doc, d) {
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('TO WHOM IT MAY CONCERN', { align: 'center' });
  doc.moveDown(1.5);

  const idNo = d.attachee_id_number || 'N/A';
  doc.font('Helvetica').fontSize(11).fillColor(INK);
  doc.text(
    `This is to certify that ${d.attachee_name} (ID No: ${idNo}) has been an attachee at ` +
      `Swahilipot Hub Foundation, ${d.department_name}, from ${longDate(d.start_date)} to ` +
      `${longDate(d.end_date)}, where they undertook the ${d.program_name} program.`,
    { align: 'justify', lineGap: 3 }
  );
  doc.moveDown(1);
  doc.text(
    `During their attachment period, ${d.attachee_name} demonstrated commitment and actively ` +
      `participated in the program activities of the ${d.department_name} department.`,
    { align: 'justify', lineGap: 3 }
  );
  doc.moveDown(1);
  doc.text('We wish them well in their future endeavors.', { align: 'justify', lineGap: 3 });
}

function completionCertificateBody(doc, d) {
  doc.moveDown(1);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(18).text('CERTIFICATE OF COMPLETION', { align: 'center' });
  doc.moveDown(2);
  doc.fillColor(INK).font('Helvetica').fontSize(11).text('This is to certify that', { align: 'center' });
  doc.moveDown(0.6);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text(d.attachee_name, { align: 'center', underline: true });
  doc.moveDown(0.6);
  doc.fillColor(INK).font('Helvetica').fontSize(11).text('has successfully completed the', { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).text(d.program_name, { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(11).text(`at Swahilipot Hub Foundation, ${d.department_name}`, { align: 'center' });
  doc.moveDown(0.4);
  doc.text(`from ${longDate(d.start_date)} to ${longDate(d.end_date)}`, { align: 'center' });
}

// POST /api/certificates/generate — supervisor only, streams a PDF.
// For attachees: pass attachee_id and the name/university/course/dates/department
// are pulled from users + attachee_profiles (manual body fields still override).
router.post('/generate', verifyToken, requireRole('supervisor'), async (req, res, next) => {
  try {
    const d = { ...(req.body || {}) };

    if (d.attachee_id) {
      const { rows } = await pool.query(
        `SELECT u.name, d.name AS department_name,
                ap.university_name, ap.course_of_study,
                ap.attachment_start_date, ap.attachment_end_date
           FROM users u
           JOIN departments d ON d.id = u.department_id
           LEFT JOIN attachee_profiles ap ON ap.user_id = u.id
          WHERE u.id = $1 AND u.role = 'attachee' AND u.department_id = $2`,
        [parseInt(d.attachee_id, 10), req.user.department_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Attachee not found' });
      const att = rows[0];
      // DB values fill in any field not explicitly provided in the body.
      d.attachee_name = d.attachee_name || att.name;
      d.department_name = d.department_name || att.department_name;
      d.program_name = d.program_name || att.course_of_study || 'Industrial Attachment';
      d.start_date = d.start_date || att.attachment_start_date;
      d.end_date = d.end_date || att.attachment_end_date;
    }

    const required = [
      'attachee_name', 'department_name', 'program_name',
      'start_date', 'end_date', 'supervisor_name', 'supervisor_title', 'certificate_type',
    ];
    for (const field of required) {
      if (!d[field] || !String(d[field]).trim()) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    if (!TYPES.includes(d.certificate_type)) {
      return res.status(400).json({ error: 'Invalid certificate_type' });
    }

    const safeName = String(d.attachee_name).replace(/[^a-z0-9]+/gi, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}-${d.certificate_type}.pdf"`
    );

    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    doc.on('error', next);
    doc.pipe(res);

    drawHeader(doc);
    if (d.certificate_type === 'completion_certificate') {
      completionCertificateBody(doc, d);
    } else {
      attachmentLetterBody(doc, d);
    }
    drawFooter(doc, d.supervisor_name, d.supervisor_title);

    doc.end();
  } catch (err) {
    return next(err);
  }
});

// POST /api/certificates/trainee — instructor only. Simple completion
// certificate for a community learner (trainee), no AI narrative.
router.post('/trainee', verifyToken, requireRole('instructor', 'supervisor'), async (req, res, next) => {
  try {
    const { trainee_id, course_name, completion_date } = req.body || {};
    if (!trainee_id) return res.status(400).json({ error: 'trainee_id is required' });
    if (!course_name || !course_name.trim()) return res.status(400).json({ error: 'course_name is required' });
    if (!completion_date) return res.status(400).json({ error: 'completion_date is required' });

    const { rows } = await pool.query(
      `SELECT t.id, t.name, d.name AS department_name
         FROM trainees t JOIN departments d ON d.id = t.department_id
        WHERE t.id = $1 AND t.department_id = $2`,
      [parseInt(trainee_id, 10), req.user.department_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Trainee not found' });
    const tr = rows[0];

    await pool.query(
      `INSERT INTO trainee_certificates (trainee_id, department_id, generated_by, course_name, completion_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [tr.id, req.user.department_id, req.user.id, course_name.trim(), completion_date]
    );

    const safeName = String(tr.name).replace(/[^a-z0-9]+/gi, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-completion-certificate.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    doc.on('error', next);
    doc.pipe(res);

    drawHeader(doc);
    doc.moveDown(1);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(18).text('CERTIFICATE OF COMPLETION', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(INK).font('Helvetica').fontSize(11).text('This is to certify that', { align: 'center' });
    doc.moveDown(0.6);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text(tr.name, { align: 'center', underline: true });
    doc.moveDown(0.6);
    doc.fillColor(INK).font('Helvetica').fontSize(11).text('has successfully completed the', { align: 'center' });
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(13).text(course_name.trim(), { align: 'center' });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(11).text(`course at Swahilipot Hub Foundation, ${tr.department_name}`, { align: 'center' });
    doc.moveDown(0.4);
    doc.text(`on ${longDate(completion_date)}`, { align: 'center' });

    drawFooter(doc, req.user.name, 'Department Instructor');
    doc.end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
