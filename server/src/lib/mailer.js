'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_PORT === '465',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

function isConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

/**
 * Sends an email. If SMTP is not configured, logs to the console (dev fallback)
 * so flows remain testable without an email provider. Returns true if emailed.
 */
async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.error(
      `[${new Date().toISOString()}] [mailer] SMTP not configured — would have sent to ${to}: ${subject}`
    );
    if (text) console.error(`[mailer] body:\n${text}`);
    return false;
  }

  const from = process.env.SMTP_FROM || 'SwahiliPot IMS <no-reply@swahilipothub.co.ke>';
  await tx.sendMail({ from, to, subject, html, text });
  return true;
}

module.exports = { sendMail, isConfigured };
