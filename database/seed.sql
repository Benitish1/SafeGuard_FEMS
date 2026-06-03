-- ============================================================================
--  SafeGuard — Seed data for demos / testing
--  Passwords below are bcrypt hashes of:  Password123!
--  Run after schema.sql:  psql -U postgres -d fems -f seed.sql
-- ============================================================================

-- Users (admin / inspector / user) — password for all = "Password123!"
INSERT INTO users (id, first_name, last_name, email, password_hash, role) VALUES
 ('11111111-1111-1111-1111-111111111111', 'Ada',   'Admin',     'admin@safeguard.com',     '$2b$10$wH8Qe1Vd4Yb1bqg0kq9YO5sJ9b7Yk2m0sJ8r4q2k8a1d6Hh3uXe', 'admin'),
 ('22222222-2222-2222-2222-222222222222', 'Ian',   'Inspector', 'inspector@safeguard.com', '$2b$10$wH8Qe1Vd4Yb1bqg0kq9YO5sJ9b7Yk2m0sJ8r4q2k8a1d6Hh3uXe', 'inspector'),
 ('33333333-3333-3333-3333-333333333333', 'Uma',   'User',      'user@safeguard.com',      '$2b$10$wH8Qe1Vd4Yb1bqg0kq9YO5sJ9b7Yk2m0sJ8r4q2k8a1d6Hh3uXe', 'user')
ON CONFLICT (email) DO NOTHING;

-- NOTE: The hashes above are placeholders. Use the backend seed script
--       (npm run seed) to create users with correct, freshly-hashed passwords.

-- Fire extinguishers
INSERT INTO fire_extinguishers
    (serial_number, location, type, size, installation_date, expiry_date, status, created_by) VALUES
 ('FE-001', 'Building A - Lobby',      'CO2',          '5 lb',  '2023-01-15', '2028-01-15', 'Active',            '11111111-1111-1111-1111-111111111111'),
 ('FE-002', 'Building A - Floor 2',    'Dry Chemical', '9 lb',  '2022-06-01', '2027-06-01', 'Active',            '11111111-1111-1111-1111-111111111111'),
 ('FE-003', 'Building B - Kitchen',    'Foam',         '12 lb', '2021-03-10', '2026-06-20', 'Needs Maintenance', '11111111-1111-1111-1111-111111111111'),
 ('FE-004', 'Warehouse - Bay 3',       'Water',        '9 lb',  '2020-09-05', '2025-09-05', 'Expired',           '11111111-1111-1111-1111-111111111111'),
 ('FE-005', 'Building C - Server Room', 'CO2',         '1.5 lb','2024-02-20', '2029-02-20', 'Active',            '11111111-1111-1111-1111-111111111111')
ON CONFLICT (serial_number) DO NOTHING;
