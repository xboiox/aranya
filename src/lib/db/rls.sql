-- ══════════════════════════════════════════════════════════════
-- Aranya HRIS — PostgreSQL Row Level Security Policies
-- Jalankan setelah migrasi Drizzle pertama kali.
-- ══════════════════════════════════════════════════════════════

-- ── Enable RLS pada semua tabel tenant-scoped ─────────────────
ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- ── Helper function: baca tenant context dari session ─────────
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT current_setting('app.current_tenant', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
  SELECT current_setting('app.bypass_rls', true) = 'on';
$$ LANGUAGE sql STABLE;

-- ── Policies ──────────────────────────────────────────────────
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
