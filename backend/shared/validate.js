// Tiny validation helpers (kept dependency-free).
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const isEmail = (v) => typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export function required(obj, fields) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
}

export function strongPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }
}

export const EXT_TYPES = ['Water', 'CO2', 'Foam', 'Dry Chemical'];
export const EXT_SIZES = ['1.5 lb', '5 lb', '9 lb', '12 lb'];
export const EXT_STATUS = ['Active', 'Inactive', 'Expired', 'Needs Maintenance', 'Decommissioned'];

export function oneOf(value, list, label) {
  if (value !== undefined && !list.includes(value)) {
    throw new HttpError(400, `Invalid ${label}. Allowed: ${list.join(', ')}`);
  }
}
