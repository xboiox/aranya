// Run with: npm run db:rls
// Applies PostgreSQL RLS policies after first migration
import { db } from "./index"
import { sql } from "drizzle-orm"
import { readFileSync } from "fs"
import { join } from "path"

async function applyRls() {
  console.log("🔒 Applying RLS policies...")

  const rlsSql = readFileSync(join(__dirname, "rls.sql"), "utf-8")

  // Split by semicolons and run each statement
  const statements = rlsSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement))
      console.log(`  ✓ ${statement.split("\n")[0].substring(0, 60)}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Ignore "already exists" errors — idempotent
      if (msg.includes("already exists")) {
        console.log(`  ~ skipped (already exists): ${statement.split("\n")[0].substring(0, 50)}`)
      } else {
        throw err
      }
    }
  }

  console.log("✅ RLS policies applied!")
}

applyRls()
  .catch((err) => { console.error("❌ RLS gagal:", err); process.exit(1) })
  .finally(() => process.exit(0))
