// medichain/backend/services/emailService.js
//
// Email delivery service for MediChain.
// Supports Nodemailer with any SMTP provider (SendGrid, SES, Gmail, etc.)
// Falls back to console-log in development/test when SMTP is not configured.
//
// ENV VARIABLES (add to backend/.env):
//   EMAIL_FROM=noreply@medichain.health
//   SMTP_HOST=smtp.sendgrid.net
//   SMTP_PORT=587
//   SMTP_USER=apikey
//   SMTP_PASS=SG.xxxxxxxxx
//   APP_URL=https://medichain.health    ← Used to build email links
//
// INSTALL: npm install nodemailer

'use strict';

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  // nodemailer not installed — will use console fallback
}

const APP_URL   = process.env.APP_URL   || 'http://localhost:3000';
const FROM_NAME = 'MediChain';
const FROM_ADDR = process.env.EMAIL_FROM || 'noreply@medichain.health';
const FROM      = `"${FROM_NAME}" <${FROM_ADDR}>`;

// ── Transport factory ─────────────────────────────────────────────────────────

let _transport = null;

const getTransport = () => {
  if (_transport) return _transport;

  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD);

  if (nodemailer && hasSmtp) {
    _transport = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      },
    });
    console.log('[EMAIL] SMTP transport configured:', process.env.SMTP_HOST);
  } else {
    // Fallback: log to console (dev/test)
    _transport = null;
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[EMAIL] ⚠️  No SMTP configured — emails will be printed to console.');
      console.warn('         Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env');
    }
  }
  return _transport;
};

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Sends an email. Falls back to console.log in development.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
const sendEmail = async (opts) => {
  const transport = getTransport();

  if (!transport) {
    // Development / no SMTP: print to console so devs can test
    console.log('\n══════════════════════════════════════════');
    console.log('[EMAIL CONSOLE FALLBACK]');
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body:    ${(opts.text || opts.html || '').substring(0, 500)}`);
    console.log('══════════════════════════════════════════\n');
    return { messageId: 'console-fallback' };
  }

  const info = await transport.sendMail({
    from:    FROM,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text || opts.html.replace(/<[^>]*>/g, ''),
  });

  console.log(`[EMAIL] Sent "${opts.subject}" to ${opts.to} — messageId: ${info.messageId}`);
  return info;
};

// ── Email templates ───────────────────────────────────────────────────────────

/**
 * Sends an email verification OTP to a newly registered user.
 *
 * @param {string} email       — recipient email
 * @param {string} name        — recipient name
 * @param {string} otp         — 6-digit verification code
 */
const sendVerificationEmail = async (email, name, otp) => {
  return sendEmail({
    to:      email,
    subject: 'Verify your MediChain email address',
    text:    `Hi ${name},\n\nPlease verify your email with this one-time code: ${otp}\n\nThis code expires in 10 minutes.\n\nMediChain Team`,
    html:    `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background: #0f1117; color: #e2e8f0; padding: 32px;">
          <div style="max-width: 520px; margin: 0 auto; background: #1a1d2e; border-radius: 12px; padding: 40px; border: 1px solid #2d3748;">
            <h1 style="color: #00d4ff; font-size: 24px; margin: 0 0 8px;">MediChain</h1>
            <p style="color: #a0aec0; margin: 0 0 32px;">Secure Health Records Platform</p>
            <h2 style="font-size: 20px; margin: 0 0 16px;">Verify your email address</h2>
            <p>Hi ${name},</p>
            <p>Welcome to MediChain! Enter the code below to activate your account.</p>
            <div style="background: #08121e; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px solid #00d4ff;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #00d4ff;">${otp}</span>
            </div>
            <p style="color: #718096; font-size: 12px; border-top: 1px solid #2d3748; padding-top: 16px; margin-top: 32px;">
              This code expires in 10 minutes. If you didn't create a MediChain account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
};

/**
 * Sends a password reset OTP.
 *
 * @param {string} email  — recipient email
 * @param {string} name   — recipient name
 * @param {string} otp    — 6-digit reset code
 */
const sendPasswordResetEmail = async (email, name, otp) => {
  return sendEmail({
    to:      email,
    subject: 'Reset your MediChain password',
    text:    `Hi ${name},\n\nReset your password with this one-time code: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.\n\nMediChain Team`,
    html:    `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background: #0f1117; color: #e2e8f0; padding: 32px;">
          <div style="max-width: 520px; margin: 0 auto; background: #1a1d2e; border-radius: 12px; padding: 40px; border: 1px solid #2d3748;">
            <h1 style="color: #00d4ff; font-size: 24px; margin: 0 0 8px;">MediChain</h1>
            <p style="color: #a0aec0; margin: 0 0 32px;">Secure Health Records Platform</p>
            <h2 style="font-size: 20px; margin: 0 0 16px;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your MediChain password. Enter the code below to choose a new password.</p>
            <div style="background: #08121e; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px solid #e53e3e;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #f6ad55;">${otp}</span>
            </div>
            <p style="color: #718096; font-size: 12px; border-top: 1px solid #2d3748; padding-top: 16px; margin-top: 32px;">
              This code expires in 10 minutes. If you didn't request a password reset, ignore this email — your password will not change.
            </p>
          </div>
        </body>
      </html>
    `,
  });
};

/**
 * Sends a security alert (suspicious login, new device, etc.)
 *
 * @param {string} email
 * @param {string} name
 * @param {string} eventDescription
 */
const sendSecurityAlert = async (email, name, eventDescription) => {
  return sendEmail({
    to:      email,
    subject: '⚠️ MediChain Security Alert',
    text:    `Hi ${name},\n\nSecurity event detected on your account:\n${eventDescription}\n\nIf this was not you, please reset your password immediately.\n\nMediChain Team`,
    html:    `
      <div style="font-family: Arial, sans-serif; padding: 32px; background: #0f1117; color: #e2e8f0;">
        <div style="max-width: 520px; margin: 0 auto; background: #1a1d2e; border-radius: 12px; padding: 40px; border: 1px solid #e53e3e;">
          <h1 style="color: #e53e3e; font-size: 24px;">⚠️ Security Alert</h1>
          <p>Hi ${name},</p>
          <p>A security event was detected on your MediChain account:</p>
          <p style="background: #2d1515; border-left: 4px solid #e53e3e; padding: 12px 16px; border-radius: 4px;">${eventDescription}</p>
          <p>If this was not you, <a href="${APP_URL}/reset-password" style="color: #00d4ff;">reset your password immediately</a>.</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSecurityAlert,
};
