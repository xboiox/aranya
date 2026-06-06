// Run with: npm run db:rls
// Applies PostgreSQL RLS policies after first migration.
// Idempotent — safe to run multiple times.
import postgres from "postgres"
import { readFileSync } from "fs"
import { join } from "path"

async function applyRls() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set in .env")

  console.log("🔒 Applying RLS policies...")

  // Use postgres.js directly — more reliable for DDL than Drizzle
  const sql = postgres(databaseUrl, { max: 1 })

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
