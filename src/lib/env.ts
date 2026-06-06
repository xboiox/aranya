import { z } from "zod"

// Validasi environment variables server-side — fail-fast saat boot.
// Diimpor oleh src/lib/db/index.ts (chokepoint app runtime).
// CATATAN: jangan diimpor dari modul yang dipakai test pure-function
// (crypto/totp/rbac) agar test tidak butuh env lengkap.

const serverEnvSchema = z.object({
  // Wajib — app tidak bisa boot tanpa ini
  DATABASE_URL: z.string().url("DATABASE_URL harus URL postgres yang valid"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET wajib (openssl rand -base64 32)"),
  AUTH_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "AUTH_ENCRYPTION_KEY harus 64 karakter hex (openssl rand -hex 32)"),

  // Opsional — divalidasi saat dipakai oleh fitur terkait
  ADMIN_DATABASE_URL: z.string().url().optional(),
  AUTH_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

function validateEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(
      `\n❌ Environment variables tidak valid:\n${issues}\n\n` +
        `Periksa file .env Anda (referensi: .env.example).\n`,
    )
  }
  return parsed.data
}

export const env = validateEnv()
