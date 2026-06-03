// Email transport (Gmail SMTP via Nodemailer).
import './env.js';
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  try {
    const info = await getTransporter().sendMail({ from, to, subject, html, text });
    console.log(`[mailer] sent "${subject}" to ${to} (${info.messageId})`);
    return { ok: true, id: info.messageId };
  } catch (err) {
    // Never crash the service if email fails — log and continue (OTP still in DB/console).
    console.error('[mailer] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

const brandWrap = (title, body) => `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#0b0f17;padding:32px">
    <div style="max-width:480px;margin:auto;background:#121826;border:1px solid #1f2937;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:20px 28px">
        <h1 style="margin:0;color:#fff;font-size:18px;letter-spacing:.5px">SafeGuard Fire Safety</h1>
      </div>
      <div style="padding:28px;color:#e5e7eb">
        <h2 style="margin:0 0 12px;font-size:17px;color:#fff">${title}</h2>
        ${body}
        <p style="margin-top:24px;font-size:12px;color:#6b7280">SafeGuard — Fire Extinguisher Management System</p>
      </div>
    </div>
  </div>`;

export function otpEmail(code, purpose) {
  const labels = {
    verify_email: 'verify your email address and activate your account',
    logout: 'confirm your logout',
    delete_account: 'confirm deleting your account',
    delete_extinguisher: 'confirm deleting a fire extinguisher record',
    password_reset: 'reset your password',
  };
  const html = brandWrap(
    'Your verification code',
    `<p>Use the code below to ${labels[purpose] || 'verify this action'}. It expires in ${process.env.OTP_TTL_MINUTES || 10} minutes.</p>
     <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#f97316;background:#0b0f17;border:1px dashed #f97316;border-radius:12px;padding:18px;text-align:center;margin:18px 0">${code}</div>
     <p style="font-size:13px;color:#9ca3af">If you didn't request this, you can safely ignore this email.</p>`
  );
  return { subject: `SafeGuard verification code: ${code}`, html, text: `Your verification code is ${code}` };
}
