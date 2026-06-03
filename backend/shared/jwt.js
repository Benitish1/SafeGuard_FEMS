import './env.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: `${user.first_name} ${user.last_name}` },
    SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, SECRET, {
    expiresIn: process.env.JWT_REFRESH_TTL || '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
