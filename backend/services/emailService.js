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

  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (nodemailer && hasSmtp) {
    _transport = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
 * Sends an email verification link to a newly registered user.
 *
 * @param {string} email       — recipient email
 * @param {string} name        — recipient name
 * @param {string} token       — raw (unhashed) verification token
 */
const sendVerificationEmail = async (email, name, token) => {
  const link = `${APP_URL}/verify-email?token=${token}`;

  return sendEmail({
    to:      email,
    subject: 'Verify your MediChain email address',
    text:    `Hi ${name},\n\nPlease verify your email:\n${link}\n\nThis link expires in 24 hours.\n\nMediChain Team`,
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
            <p>Welcome to MediChain! Please verify your email address to activate your account.</p>
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0;">
              Verify Email Address
            </a>
            <p style="color: #718096; font-size: 14px; margin-top: 24px;">
              Or paste this link in your browser:<br>
              <a href="${link}" style="color: #00d4ff;">${link}</a>
            </p>
            <p style="color: #718096; font-size: 12px; border-top: 1px solid #2d3748; padding-top: 16px; margin-top: 32px;">
              This link expires in 24 hours. If you didn't create a MediChain account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
};

/**
 * Sends a password reset link.
 *
 * @param {string} email  — recipient email
 * @param {string} name   — recipient name
 * @param {string} token  — raw (unhashed) reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
  const link = `${APP_URL}/reset-password?token=${token}`;

  return sendEmail({
    to:      email,
    subject: 'Reset your MediChain password',
    text:    `Hi ${name},\n\nReset your password:\n${link}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.\n\nMediChain Team`,
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
            <p>We received a request to reset your MediChain password. Click the button below to choose a new password.</p>
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #f6ad55, #e53e3e); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0;">
              Reset Password
            </a>
            <p style="color: #718096; font-size: 14px; margin-top: 24px;">
              Or paste this link:<br>
              <a href="${link}" style="color: #00d4ff;">${link}</a>
            </p>
            <p style="color: #718096; font-size: 12px; border-top: 1px solid #2d3748; padding-top: 16px; margin-top: 32px;">
              This link expires in 1 hour. If you didn't request a password reset, ignore this email — your password will not change.
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
