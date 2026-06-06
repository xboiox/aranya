-- ══════════════════════════════════════════════════════════════
-- Aranya HRIS — PostgreSQL Row Level Security Policies
-- Idempotent: aman dijalankan berulang kali (DROP IF EXISTS)
-- Jalankan setelah: npm run db:migrate
-- ══════════════════════════════════════════════════════════════

-- ── Helper functions (OR REPLACE = idempotent) ───────────────

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT current_setting('app.current_tenant', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
  SELECT current_setting('app.bypass_rls', true) = 'on';
$$ LANGUAGE sql STABLE;

-- ── Enable + FORCE RLS (idempotent) ──────────────────────────
-- FORCE wajib: tanpanya, table OWNER (user 'aranya' yang dipakai app)
-- otomatis bypass RLS → policy jadi no-op. FORCE membuat owner pun
-- tunduk pada RLS, kecuali saat app.bypass_rls='on' (withSuperAdminContext).

ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         ENABLE ROW LEVEL SECURITY;

ALTER TABLE employees          FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules     FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_config      FORCE ROW LEVEL SECURITY;
ALTER TABLE holidays           FORCE ROW LEVEL SECURITY;
ALTER TABLE user_roles         FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications      FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations        FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         FORCE ROW LEVEL SECURITY;
ALTER TABLE geofence_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance         FORCE ROW LEVEL SECURITY;

-- ── Drop existing policies before recreating (idempotent) ────

DROP POLICY IF EXISTS tenant_isolation ON employees;
DROP POLICY IF EXISTS tenant_isolation ON tenant_modules;
DROP POLICY IF EXISTS tenant_isolation ON tenant_config;
DROP POLICY IF EXISTS tenant_isolation ON holidays;
DROP POLICY IF EXISTS tenant_isolation ON user_roles;
DROP POLICY IF EXISTS tenant_isolation ON notifications;
DROP POLICY IF EXISTS tenant_isolation ON invitations;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation ON geofence_locations;
DROP POLICY IF EXISTS tenant_isolation ON attendance;

-- ── Create policies ───────────────────────────────────────────

CREATE POLICY tenant_isolation ON employees
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON tenant_modules
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON tenant_config
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON holidays
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON user_roles
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON invitations
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON geofence_locations
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY tenant_isolation ON attendance
  USING (tenant_id = current_tenant_id() OR is_super_admin());
