// Seeds users (with correctly hashed passwords) + sample extinguishers.
// Run AFTER migrate:  npm run seed
import '../shared/env.js';
import { pool } from '../shared/db.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'Password123!';

const users = [
  { first: 'Ada', last: 'Admin',     email: 'admin@safeguard.com',     role: 'admin' },
  { first: 'Ian', last: 'Inspector', email: 'inspector@safeguard.com', role: 'inspector' },
  { first: 'Uma', last: 'User',      email: 'user@safeguard.com',      role: 'user' },
];

const extinguishers = [
  ['FE-001', 'Building A - Lobby',       'CO2',          '5 lb',   '2023-01-15', '2028-01-15', 'Active'],
  ['FE-002', 'Building A - Floor 2',     'Dry Chemical', '9 lb',   '2022-06-01', '2027-06-01', 'Active'],
  ['FE-003', 'Building B - Kitchen',     'Foam',         '12 lb',  '2021-03-10', '2026-06-20', 'Needs Maintenance'],
  ['FE-004', 'Warehouse - Bay 3',        'Water',        '9 lb',   '2020-09-05', '2025-09-05', 'Expired'],
  ['FE-005', 'Building C - Server Room', 'CO2',          '1.5 lb', '2024-02-20', '2029-02-20', 'Active'],
];

(async () => {
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);
    let adminId = null;
    for (const u of users) {
      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
         RETURNING id, role`,
        [u.first, u.last, u.email, hash, u.role]
      );
      if (rows[0].role === 'admin') adminId = rows[0].id;
      console.log(`  user: ${u.email} (${u.role})`);
    }

    for (const e of extinguishers) {
      await pool.query(
        `INSERT INTO fire_extinguishers
           (serial_number, location, type, size, installation_date, expiry_date, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (serial_number) DO NOTHING`,
        [...e, adminId]
      );
      console.log(`  extinguisher: ${e[0]}`);
    }

    console.log(`\nSeed complete. Login with any of the emails above, password: ${PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
