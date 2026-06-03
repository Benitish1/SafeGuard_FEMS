-- ============================================================================
--  SafeGuard — Fire Extinguisher Management System
--  PostgreSQL Database Model (DDL)
--  Activity 1.2 — Database Design: schema, relationships, constraints, indexes
-- ============================================================================
--  Run with:  psql -U postgres -d fems -f schema.sql
--  (Create the DB first:  CREATE DATABASE fems;)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Clean slate (safe re-run during development)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications      CASCADE;
DROP TABLE IF EXISTS maintenance_logs   CASCADE;
DROP TABLE IF EXISTS inspections        CASCADE;
DROP TABLE IF EXISTS fire_extinguishers CASCADE;
DROP TABLE IF EXISTS otp_codes          CASCADE;
DROP TABLE IF EXISTS refresh_tokens     CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

DROP TYPE IF EXISTS user_role           CASCADE;
DROP TYPE IF EXISTS extinguisher_type   CASCADE;
DROP TYPE IF EXISTS extinguisher_size   CASCADE;
DROP TYPE IF EXISTS extinguisher_status CASCADE;
DROP TYPE IF EXISTS inspection_status   CASCADE;
DROP TYPE IF EXISTS otp_purpose         CASCADE;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enumerated domains (constraints at the type level)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role           AS ENUM ('admin', 'inspector', 'user');
CREATE TYPE extinguisher_type   AS ENUM ('Water', 'CO2', 'Foam', 'Dry Chemical');
CREATE TYPE extinguisher_size   AS ENUM ('1.5 lb', '5 lb', '9 lb', '12 lb');
CREATE TYPE extinguisher_status AS ENUM ('Active', 'Inactive', 'Expired', 'Needs Maintenance', 'Decommissioned');
CREATE TYPE inspection_status   AS ENUM ('Pending', 'Completed', 'Overdue', 'Cancelled');
CREATE TYPE otp_purpose         AS ENUM ('verify_email', 'logout', 'delete_account', 'delete_extinguisher', 'password_reset');

-- ============================================================================
-- 1. USERS  (User Management Service)
-- ============================================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name    VARCHAR(60)  NOT NULL,
    last_name     VARCHAR(60)  NOT NULL,
    email         VARCHAR(160) NOT NULL,
    password_hash TEXT         NOT NULL,
    role          user_role    NOT NULL DEFAULT 'user',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email      UNIQUE (email),
    CONSTRAINT chk_users_email_fmt CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT chk_users_names     CHECK (length(trim(first_name)) > 0 AND length(trim(last_name)) > 0)
);

CREATE INDEX idx_users_role ON users (role);

-- ============================================================================
-- 2. REFRESH TOKENS / SESSIONS  (Authentication Service)
--    Supports JWT refresh + server-side logout (token revocation).
-- ============================================================================
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    token_hash  TEXT NOT NULL,
    user_agent  TEXT,
    ip_address  VARCHAR(64),
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_user    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);

-- ============================================================================
-- 3. OTP CODES  (secures sensitive actions: logout / delete / password reset)
-- ============================================================================
CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    code        VARCHAR(6)  NOT NULL,
    purpose     otp_purpose NOT NULL,
    reference   TEXT,                          -- e.g. extinguisher id being deleted
    consumed    BOOLEAN NOT NULL DEFAULT FALSE,
    attempts    SMALLINT NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_otp_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_otp_len CHECK (char_length(code) = 6)
);

CREATE INDEX idx_otp_user_purpose ON otp_codes (user_id, purpose);
CREATE INDEX idx_otp_expires      ON otp_codes (expires_at);

-- ============================================================================
-- 4. FIRE EXTINGUISHERS  (Fire Extinguisher Management Service)
-- ============================================================================
CREATE TABLE fire_extinguishers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number     VARCHAR(64)  NOT NULL,
    location          VARCHAR(200) NOT NULL,
    type              extinguisher_type   NOT NULL,
    size              extinguisher_size   NOT NULL,
    installation_date DATE NOT NULL,
    expiry_date       DATE NOT NULL,
    status            extinguisher_status NOT NULL DEFAULT 'Active',
    created_by        UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_ext_serial      UNIQUE (serial_number),
    CONSTRAINT chk_ext_dates      CHECK (expiry_date > installation_date),
    CONSTRAINT fk_ext_created_by  FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_ext_status   ON fire_extinguishers (status);
CREATE INDEX idx_ext_type     ON fire_extinguishers (type);
CREATE INDEX idx_ext_expiry   ON fire_extinguishers (expiry_date);
CREATE INDEX idx_ext_location ON fire_extinguishers (location);

-- ============================================================================
-- 5. INSPECTIONS  (Inspection & Maintenance Service)
-- ============================================================================
CREATE TABLE inspections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extinguisher_id  UUID NOT NULL,
    inspector_id     UUID,
    scheduled_date   DATE NOT NULL,
    scheduled_time   TIME NOT NULL DEFAULT '09:00',
    status           inspection_status NOT NULL DEFAULT 'Pending',
    result           TEXT,
    notes            TEXT,
    completed_at     TIMESTAMPTZ,
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_insp_ext FOREIGN KEY (extinguisher_id)
        REFERENCES fire_extinguishers (id) ON DELETE CASCADE,
    CONSTRAINT fk_insp_inspector FOREIGN KEY (inspector_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_insp_created_by FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_insp_ext       ON inspections (extinguisher_id);
CREATE INDEX idx_insp_status    ON inspections (status);
CREATE INDEX idx_insp_sched     ON inspections (scheduled_date);
CREATE INDEX idx_insp_inspector ON inspections (inspector_id);

-- ============================================================================
-- 6. MAINTENANCE LOGS  (Inspection & Maintenance Service)
-- ============================================================================
CREATE TABLE maintenance_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extinguisher_id   UUID NOT NULL,
    inspector_id      UUID,
    action_taken      VARCHAR(200) NOT NULL,
    maintenance_date  DATE NOT NULL,
    issues_identified TEXT,
    notes             TEXT,
    recommendations   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_maint_ext FOREIGN KEY (extinguisher_id)
        REFERENCES fire_extinguishers (id) ON DELETE CASCADE,
    CONSTRAINT fk_maint_inspector FOREIGN KEY (inspector_id)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_maint_ext  ON maintenance_logs (extinguisher_id);
CREATE INDEX idx_maint_date ON maintenance_logs (maintenance_date);

-- ============================================================================
-- 7. NOTIFICATIONS  (Notification Service)
-- ============================================================================
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    title      VARCHAR(160) NOT NULL,
    message    TEXT NOT NULL,
    type       VARCHAR(40) NOT NULL DEFAULT 'info',
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_user ON notifications (user_id, is_read);

-- ============================================================================
-- Triggers — keep updated_at fresh
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated   BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ext_updated     BEFORE UPDATE ON fire_extinguishers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_insp_updated    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Reporting helper view — compliance snapshot
-- ============================================================================
CREATE OR REPLACE VIEW v_compliance AS
SELECT
    e.id,
    e.serial_number,
    e.location,
    e.type,
    e.status,
    e.expiry_date,
    CASE
        WHEN e.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN e.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Compliant'
    END AS compliance_status
FROM fire_extinguishers e;
