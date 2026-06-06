// Run with: npm run db:rls
// Applies PostgreSQL RLS policies after first migration.
// Idempotent — safe to run multiple times.
import postgres from "postgres"
import { readFileSync } from "fs"
import { join } from "path"

async function applyRls() {
  // DDL (ALTER TABLE, CREATE POLICY, FORCE RLS) butuh hak admin
  const databaseUrl = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("ADMIN_DATABASE_URL / DATABASE_URL is not set in .env")

  console.log("🔒 Applying RLS policies...")

  // Use postgres.js directly — more reliable for DDL than Drizzle.
  // onnotice: suppress harmless NOTICE messages (e.g. "DROP POLICY IF EXISTS ... skipping")
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} })

  try {
    const rlsSql = readFileSync(join(process.cwd(), "src/lib/db/rls.sql"), "utf-8")
    // Execute entire file as one transaction
    await sql.unsafe(rlsSql)
    console.log("✅ RLS policies applied!")
  } finally {
    await sql.end()
  }
}

applyRls().catch((err) => {
  console.error("❌ RLS gagal:", err.message ?? err)
  process.exit(1)
})
