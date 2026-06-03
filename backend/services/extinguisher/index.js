// ============================================================================
//  Fire Extinguisher Management Service  (port 4002)
//  Register / list / view / update / delete extinguishers.
// ============================================================================
import { createService, mountErrorHandler, wrap } from '../../shared/service.js';
import { query } from '../../shared/db.js';
import { authenticate, authorize } from '../../shared/auth.middleware.js';
import { verifyOtp } from '../../shared/otp.js';
import { HttpError, required, oneOf, EXT_TYPES, EXT_SIZES, EXT_STATUS } from '../../shared/validate.js';

const app = createService('extinguisher');
const PORT = process.env.EXTINGUISHER_PORT || 4002;

const map = (e) => ({
  id: e.id, serialNumber: e.serial_number, location: e.location, type: e.type, size: e.size,
  installationDate: e.installation_date, expiryDate: e.expiry_date, status: e.status,
  createdBy: e.created_by, createdAt: e.created_at, updatedAt: e.updated_at,
});

// ---- List (with optional filters + search) --------------------------------
app.get('/extinguishers', authenticate, wrap(async (req, res) => {
  const { status, type, q } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (type)   { params.push(type);   where.push(`type = $${params.length}`); }
  if (q)      { params.push(`%${q}%`); where.push(`(serial_number ILIKE $${params.length} OR location ILIKE $${params.length})`); }
  const sql = `SELECT * FROM fire_extinguishers ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ count: rows.length, extinguishers: rows.map(map) });
}));

// ---- View by id -----------------------------------------------------------
app.get('/extinguishers/:id', authenticate, wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Fire extinguisher not found.');
  res.json({ extinguisher: map(rows[0]) });
}));

// ---- Register (ADMIN only) ------------------------------------------------
// Extinguishers are company assets, so only an Admin registers them into the system.
app.post('/extinguishers', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { serialNumber, location, type, size, installationDate, expiryDate, status } = req.body;
  required(req.body, ['serialNumber', 'location', 'type', 'size', 'installationDate', 'expiryDate']);
  oneOf(type, EXT_TYPES, 'type');
  oneOf(size, EXT_SIZES, 'size');
  oneOf(status, EXT_STATUS, 'status');
  if (new Date(expiryDate) <= new Date(installationDate)) throw new HttpError(400, 'Expiry date must be after installation date.');

  const dup = await query('SELECT 1 FROM fire_extinguishers WHERE serial_number = $1', [serialNumber]);
  if (dup.rowCount) throw new HttpError(409, 'A extinguisher with this serial number already exists.');

  const { rows } = await query(
    `INSERT INTO fire_extinguishers
       (serial_number, location, type, size, installation_date, expiry_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [serialNumber, location, type, size, installationDate, expiryDate, status || 'Active', req.user.id]
  );
  res.status(201).json({ message: 'Fire extinguisher registered', extinguisher: map(rows[0]) });
}));

// ---- Update full record (ADMIN only) --------------------------------------
// Editing asset details (serial, location, type, size, dates) is an Admin job.
// Inspectors change only the condition via PUT /extinguishers/:id/status below.
app.put('/extinguishers/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { serialNumber, location, type, size, installationDate, expiryDate, status } = req.body;
  oneOf(type, EXT_TYPES, 'type');
  oneOf(size, EXT_SIZES, 'size');
  oneOf(status, EXT_STATUS, 'status');
  const { rows } = await query(
    `UPDATE fire_extinguishers SET
        serial_number     = COALESCE($1, serial_number),
        location          = COALESCE($2, location),
        type              = COALESCE($3, type),
        size              = COALESCE($4, size),
        installation_date = COALESCE($5, installation_date),
        expiry_date       = COALESCE($6, expiry_date),
        status            = COALESCE($7, status)
     WHERE id = $8 RETURNING *`,
    [serialNumber || null, location || null, type || null, size || null,
     installationDate || null, expiryDate || null, status || null, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Fire extinguisher not found.');
  res.json({ message: 'Fire extinguisher updated', extinguisher: map(rows[0]) });
}));

// ---- Update condition/status only (ADMIN or INSPECTOR) --------------------
// This is how an Inspector reflects what they found in the field
// (Active / Needs Maintenance / Expired, etc.) without editing asset details.
app.put('/extinguishers/:id/status', authenticate, authorize('admin', 'inspector'), wrap(async (req, res) => {
  const { status } = req.body;
  required(req.body, ['status']);
  oneOf(status, EXT_STATUS, 'status');
  const { rows } = await query(
    'UPDATE fire_extinguishers SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Fire extinguisher not found.');
  res.json({ message: 'Status updated', extinguisher: map(rows[0]) });
}));

// ---- Delete (ADMIN only) — REQUIRES OTP -----------------------------------
app.delete('/extinguishers/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { otp } = req.body || {};
  required(req.body || {}, ['otp']);
  const check = await verifyOtp({ userId: req.user.id, code: otp, purpose: 'delete_extinguisher', reference: req.params.id });
  if (!check.ok) throw new HttpError(400, check.reason);
  const { rowCount } = await query('DELETE FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Fire extinguisher not found.');
  res.json({ message: 'Fire extinguisher deleted.' });
}));

mountErrorHandler(app, 'extinguisher');
app.listen(PORT, () => console.log(`Extinguisher service on http://localhost:${PORT}`));
