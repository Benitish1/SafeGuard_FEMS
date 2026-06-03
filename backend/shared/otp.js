// OTP generation + verification, shared by services that guard sensitive actions.
import './env.js';
import { query } from './db.js';
import { sendMail, otpEmail } from './mailer.js';

const TTL_MIN = Number(process.env.OTP_TTL_MINUTES) || 10;

// Deterministic-enough 6 digit code without Math.random dependency concerns.
function generateCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export async function createAndSendOtp({ userId, email, purpose, reference = null }) {
  const code = generateCode();
  await query(
    `INSERT INTO otp_codes (user_id, code, purpose, reference, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [userId, code, purpose, reference, String(TTL_MIN)]
  );
  const mail = otpEmail(code, purpose);
  const result = await sendMail({ to: email, ...mail });
  // For local/demo without working SMTP, also surface the code in the server log.
  console.log(`[otp] ${purpose} code for ${email}: ${code} (emailSent=${result.ok})`);
  return { sent: result.ok };
}

// Returns { ok: true, otp } or { ok: false, reason }
export async function verifyOtp({ userId, code, purpose, reference = null }) {
  const { rows } = await query(
    `SELECT * FROM otp_codes
      WHERE user_id = $1 AND purpose = $2 AND consumed = false
      ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  const otp = rows[0];
  if (!otp) return { ok: false, reason: 'No active code. Please request a new one.' };
  if (new Date(otp.expires_at) < new Date()) return { ok: false, reason: 'Code expired. Request a new one.' };
  if (otp.attempts >= 5) return { ok: false, reason: 'Too many attempts. Request a new code.' };
  if (reference && otp.reference && otp.reference !== reference) {
    return { ok: false, reason: 'Code does not match this action.' };
  }
  if (otp.code !== String(code)) {
    await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
    return { ok: false, reason: 'Incorrect code.' };
  }
  await query('UPDATE otp_codes SET consumed = true WHERE id = $1', [otp.id]);
  return { ok: true, otp };
}
