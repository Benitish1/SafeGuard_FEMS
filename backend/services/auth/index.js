// ============================================================================
//  Auth & User Management Service  (port 4001)
//  Registration, login/logout (OTP), JWT, RBAC, profile, password reset.
// ============================================================================
import { createService, mountErrorHandler, wrap } from '../../shared/service.js';
import { query } from '../../shared/db.js';
import { authenticate, authorize } from '../../shared/auth.middleware.js';
import { signAccessToken, signRefreshToken } from '../../shared/jwt.js';
import { createAndSendOtp, verifyOtp } from '../../shared/otp.js';
import { HttpError, isEmail, required, strongPassword } from '../../shared/validate.js';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const app = createService('auth');
const PORT = process.env.AUTH_PORT || 4001;

const publicUser = (u) => ({
  id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email,
  role: u.role, isActive: u.is_active, lastLoginAt: u.last_login_at, createdAt: u.created_at,
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// ---- Registration ---------------------------------------------------------
app.post('/auth/register', wrap(async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  required(req.body, ['firstName', 'lastName', 'email', 'password']);
  if (!String(email).includes('@')) throw new HttpError(400, 'Email must contain "@".');
  if (email !== String(email).toLowerCase()) throw new HttpError(400, 'Email must be lowercase — capital letters are not allowed.');
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email address.');
  strongPassword(password);

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rowCount) throw new HttpError(409, 'An account with this email already exists.');

  // Public signup is always a 'user'. New accounts start INACTIVE until the
  // email is verified with a one-time code (OTP).
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
     VALUES ($1,$2,$3,$4,'user', false) RETURNING *`,
    [firstName.trim(), lastName.trim(), email.toLowerCase(), hash]
  );
  const user = rows[0];
  await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'verify_email' });
  res.status(201).json({
    message: 'Registration successful. Enter the verification code we emailed you.',
    needsVerification: true,
    email: user.email,
  });
}));

// ---- Verify email after registration (OTP) --------------------------------
app.post('/auth/verify-email', wrap(async (req, res) => {
  const { email, otp } = req.body;
  required(req.body, ['email', 'otp']);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user) throw new HttpError(404, 'Account not found.');
  if (user.is_active) return res.json({ message: 'Email already verified. You can sign in.' });
  const check = await verifyOtp({ userId: user.id, code: otp, purpose: 'verify_email' });
  if (!check.ok) throw new HttpError(400, check.reason);
  await query('UPDATE users SET is_active = true WHERE id = $1', [user.id]);
  res.json({ message: 'Email verified! You can now sign in.' });
}));

// ---- Resend the email-verification code ------------------------------------
app.post('/auth/verify-email/resend', wrap(async (req, res) => {
  const { email } = req.body;
  required(req.body, ['email']);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user) throw new HttpError(404, 'Account not found.');
  if (user.is_active) return res.json({ message: 'Email already verified.' });
  await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'verify_email' });
  res.json({ message: `A new verification code was sent to ${user.email}.` });
}));

// ---- Login ----------------------------------------------------------------
app.post('/auth/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = req.body;
  required(req.body, ['email', 'password']);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Invalid credentials.');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials.');
  if (!user.is_active) throw new HttpError(403, 'Please verify your email before signing in.');

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshHash = await bcrypt.hash(refreshToken, 8);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1,$2,$3,$4, now() + interval '7 days')`,
    [user.id, refreshHash, req.headers['user-agent'] || '', req.ip]
  );
  res.json({ message: 'Login successful', accessToken, refreshToken, user: publicUser(user) });
}));

// ---- Forgot password: send a reset code (unauthenticated) -----------------
app.post('/auth/forgot-password', wrap(async (req, res) => {
  const { email } = req.body;
  required(req.body, ['email']);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  // Only send if the account exists, but always respond the same way so we don't
  // leak which emails are registered.
  if (user) {
    await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'password_reset' });
  }
  res.json({ message: 'If that email is registered, a reset code has been sent.' });
}));

// ---- Reset password with the code (unauthenticated) -----------------------
app.post('/auth/reset-password', wrap(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  required(req.body, ['email', 'otp', 'newPassword']);
  strongPassword(newPassword);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user) throw new HttpError(400, 'Invalid email or code.');
  const check = await verifyOtp({ userId: user.id, code: otp, purpose: 'password_reset' });
  if (!check.ok) throw new HttpError(400, check.reason);
  const hash = await bcrypt.hash(newPassword, 10);
  // Resetting the password also activates the account (handles the case of an
  // unverified user) and revokes any existing sessions.
  await query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [hash, user.id]);
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [user.id]);
  res.json({ message: 'Password reset successful. You can now sign in.' });
}));

// ---- Request an OTP (delete account / delete extinguisher) -----------------
app.post('/auth/otp/request', authenticate, wrap(async (req, res) => {
  const { purpose, reference } = req.body;
  const allowed = ['delete_account', 'delete_extinguisher'];
  if (!allowed.includes(purpose)) throw new HttpError(400, 'Invalid OTP purpose.');
  await createAndSendOtp({ userId: req.user.id, email: req.user.email, purpose, reference: reference || null });
  res.json({ message: `A verification code was sent to ${req.user.email}.` });
}));

// ---- Logout (confirmation only, no OTP) -----------------------------------
app.post('/auth/logout', authenticate, wrap(async (req, res) => {
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Logged out successfully. All sessions revoked.' });
}));

// ---- Current profile ------------------------------------------------------
app.get('/auth/me', authenticate, wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw new HttpError(404, 'User not found.');
  res.json({ user: publicUser(rows[0]) });
}));

// ---- Update profile -------------------------------------------------------
app.put('/auth/me', authenticate, wrap(async (req, res) => {
  const { firstName, lastName, email } = req.body;
  if (email && !isEmail(email)) throw new HttpError(400, 'Invalid email.');
  if (email) {
    const taken = await query('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase(), req.user.id]);
    if (taken.rowCount) throw new HttpError(409, 'Email already in use.');
  }
  const { rows } = await query(
    `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        email      = COALESCE($3, email)
     WHERE id = $4 RETURNING *`,
    [firstName || null, lastName || null, email ? email.toLowerCase() : null, req.user.id]
  );
  res.json({ message: 'Profile updated', user: publicUser(rows[0]) });
}));

// ---- Change password ------------------------------------------------------
app.put('/auth/me/password', authenticate, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  required(req.body, ['currentPassword', 'newPassword']);
  strongPassword(newPassword);
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) throw new HttpError(400, 'Current password is incorrect.');
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Password changed. Please log in again.' });
}));

// ---- Delete own account (requires OTP) ------------------------------------
app.delete('/auth/me', authenticate, wrap(async (req, res) => {
  const { otp } = req.body;
  required(req.body, ['otp']);
  const check = await verifyOtp({ userId: req.user.id, code: otp, purpose: 'delete_account' });
  if (!check.ok) throw new HttpError(400, check.reason);
  await query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.json({ message: 'Your account has been permanently deleted.' });
}));

// ---- Admin: list / manage users -------------------------------------------
app.get('/auth/users', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ users: rows.map(publicUser) });
}));

app.put('/auth/users/:id/role', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'inspector', 'user'].includes(role)) throw new HttpError(400, 'Invalid role.');
  const { rows } = await query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'User not found.');
  res.json({ message: 'Role updated', user: publicUser(rows[0]) });
}));

app.delete('/auth/users/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deleted.' });
}));

// Internal endpoint used by other services to fetch user emails for notifications.
app.get('/auth/internal/users/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [req.params.id]);
  res.json({ user: rows[0] || null });
}));

mountErrorHandler(app, 'auth');
app.listen(PORT, () => console.log(`Auth service on http://localhost:${PORT}`));
