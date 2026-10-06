import nodemailer from 'nodemailer';
import { ENV_VARS } from '../config/env.config.js';

/**
 * Creates and caches a Nodemailer SMTP transporter.
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (ENV_VARS.SMTP_USER && ENV_VARS.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: ENV_VARS.SMTP_HOST || 'smtp.gmail.com',
      port: ENV_VARS.SMTP_PORT || 587,
      secure: ENV_VARS.SMTP_SECURE,
      auth: {
        user: ENV_VARS.SMTP_USER,
        pass: ENV_VARS.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Responsive HTML wrapper for Netflix-branded emails.
 */
const renderEmailHtml = ({ title, bodyContent }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #141414;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #1f1f1f;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #333333;
    }
    .header {
      background-color: #000000;
      padding: 24px 32px;
      text-align: center;
      border-bottom: 3px solid #E50914;
    }
    .logo {
      color: #E50914;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
    }
    .code-box {
      background: #000000;
      border: 2px dashed #E50914;
      border-radius: 6px;
      padding: 18px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #ffffff;
      margin: 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #E50914;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: bold;
      padding: 14px 28px;
      border-radius: 4px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #141414;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #8c8c8c;
      border-top: 1px solid #2a2a2a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">NETFLIX</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated notification from Netflix Clone. If you did not request this, please ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} Netflix Clone. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Sends a 6-digit OTP verification email.
 */
export const sendVerificationEmail = async (email, verificationCode) => {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`\n========================================`);
    console.log(`✉️ [SMTP Dev Mode] Verification Code for ${email}: ${verificationCode}`);
    console.log(`========================================\n`);
    return;
  }

  const html = renderEmailHtml({
    title: 'Verify Your Email',
    bodyContent: `
      <h2 style="color: #ffffff; margin-top: 0;">Confirm your email address</h2>
      <p style="color: #cccccc;">Thank you for signing up for Netflix Clone. Enter this verification code to activate your account:</p>
      <div class="code-box">${verificationCode}</div>
      <p style="color: #999999; font-size: 13px;">This code expires in 24 hours. For security reasons, do not share this code with anyone.</p>
    `,
  });

  try {
    const info = await mailTransporter.sendMail({
      from: ENV_VARS.EMAIL_FROM,
      to: email,
      subject: `Your Netflix Clone Verification Code: ${verificationCode}`,
      html,
    });
    console.log(`✅ Verification email sent to ${email} (MessageId: ${info.messageId})`);
  } catch (error) {
    console.warn(`⚠️ [SMTP Error] Could not send verification email to ${email}: ${error.message}`);
    console.log(`✉️ [Fallback] Verification Code for ${email}: ${verificationCode}`);
  }
};

/**
 * Sends a welcome email upon successful account verification.
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`✉️ [SMTP Dev Mode] Welcome email skipped for ${email} (${name})`);
    return;
  }

  const clientUrl = ENV_VARS.CLIENT_URL || 'http://localhost:5173';
  const html = renderEmailHtml({
    title: 'Welcome to Netflix Clone',
    bodyContent: `
      <h2 style="color: #ffffff; margin-top: 0;">Welcome, ${name}!</h2>
      <p style="color: #cccccc;">Your account is now verified and ready to use. Dive into popular movies, trending series, and custom video uploads.</p>
      <div style="text-align: center;">
        <a href="${clientUrl}" class="btn">Start Watching Now</a>
      </div>
    `,
  });

  try {
    const info = await mailTransporter.sendMail({
      from: ENV_VARS.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Netflix Clone!',
      html,
    });
    console.log(`✅ Welcome email sent to ${email} (MessageId: ${info.messageId})`);
  } catch (error) {
    console.warn(`⚠️ [SMTP Error] Could not send welcome email: ${error.message}`);
  }
};

/**
 * Sends a password reset link.
 */
export const sendPasswordResetEmail = async (email, url) => {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`\n========================================`);
    console.log(`🔑 [SMTP Dev Mode] Password Reset Link for ${email}: ${url}`);
    console.log(`========================================\n`);
    return;
  }

  const html = renderEmailHtml({
    title: 'Reset Your Password',
    bodyContent: `
      <h2 style="color: #ffffff; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #cccccc;">We received a request to reset your Netflix Clone password. Click the button below to proceed:</p>
      <div style="text-align: center;">
        <a href="${url}" class="btn">Reset Password</a>
      </div>
      <p style="color: #999999; font-size: 13px;">This link will expire in 2 hours. If you did not make this request, you can safely ignore this email.</p>
      <p style="color: #777777; font-size: 11px; word-break: break-all;">Link URL: ${url}</p>
    `,
  });

  try {
    const info = await mailTransporter.sendMail({
      from: ENV_VARS.EMAIL_FROM,
      to: email,
      subject: 'Reset your Netflix Clone password',
      html,
    });
    console.log(`✅ Password reset email sent to ${email} (MessageId: ${info.messageId})`);
  } catch (error) {
    console.warn(`⚠️ [SMTP Error] Could not send password reset email: ${error.message}`);
    console.log(`🔑 [Fallback] Reset URL for ${email}: ${url}`);
  }
};

/**
 * Sends a confirmation email that password was successfully reset.
 */
export const sendPasswordResetSuccessEmail = async (email) => {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`✉️ [SMTP Dev Mode] Password reset success confirmation skipped for ${email}`);
    return;
  }

  const html = renderEmailHtml({
    title: 'Password Successfully Reset',
    bodyContent: `
      <h2 style="color: #ffffff; margin-top: 0;">Password Changed</h2>
      <p style="color: #cccccc;">Your password for Netflix Clone has been successfully updated.</p>
      <p style="color: #999999; font-size: 13px;">If you did not perform this change, please immediately contact security or reset your password.</p>
    `,
  });

  try {
    const info = await mailTransporter.sendMail({
      from: ENV_VARS.EMAIL_FROM,
      to: email,
      subject: 'Your Netflix Clone password was reset',
      html,
    });
    console.log(`✅ Password reset confirmation sent to ${email} (MessageId: ${info.messageId})`);
  } catch (error) {
    console.warn(`⚠️ [SMTP Error] Could not send reset confirmation: ${error.message}`);
  }
};
