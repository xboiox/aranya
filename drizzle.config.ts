import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrasi/DDL butuh hak admin (superuser/owner) — bukan app role yang dibatasi RLS
    url: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
