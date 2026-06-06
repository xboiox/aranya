// Run with: npm run db:setup-role
// Membuat role aplikasi non-superuser (RLS dienforce untuknya).
// Role ini diparse dari DATABASE_URL; koneksi admin dari ADMIN_DATABASE_URL.
import postgres from "postgres"

function parseUrl(url: string) {
  const u = new URL(url)
  return {
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  }
}

// Validasi identifier sederhana (hindari injeksi pada DDL)
function assertIdent(name: string, label: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`${label} tidak valid sebagai identifier PostgreSQL: ${name}`)
  }
}

async function main() {
  const adminUrl = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL
  const appUrl = process.env.DATABASE_URL
  if (!adminUrl) throw new Error("ADMIN_DATABASE_URL / DATABASE_URL tidak diset")
  if (!appUrl) throw new Error("DATABASE_URL tidak diset")

  const app = parseUrl(appUrl)
  assertIdent(app.user, "DATABASE_URL user")
  assertIdent(app.database, "DATABASE_URL database")
  if (!app.password) throw new Error("Password app role kosong di DATABASE_URL")

  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} })
  const pw = app.password.replace(/'/g, "''")

  console.log(`🔑 Setup app role '${app.user}' (non-superuser, RLS-enforced)...`)

  try {
    // Buat / update role
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${app.user}') THEN
          CREATE ROLE "${app.user}" LOGIN PASSWORD '${pw}'
            NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
        ELSE
          ALTER ROLE "${app.user}" WITH LOGIN PASSWORD '${pw}'
            NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
        END IF;
      END $$;
    `)

    // Grant privileges (DML saja, tidak DDL)
    await sql.unsafe(`
      GRANT CONNECT ON DATABASE "${app.database}" TO "${app.user}";
      GRANT USAGE ON SCHEMA public TO "${app.user}";
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${app.user}";
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${app.user}";
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${app.user}";
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO "${app.user}";
    `)

    console.log(`✅ Role '${app.user}' siap. App akan tunduk pada RLS.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("❌ Setup role gagal:", err.message ?? err)
  process.exit(1)
})
