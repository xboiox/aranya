"use server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { isLocale, LOCALE_COOKIE } from "@/i18n/routing"

const schema = z.object({
  email:    z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
})

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  // Maks 5 percobaan login per IP / menit
  const limit = await rateLimit("login", 5, 60)
  if (!limit.success) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.resetIn} detik.` }
  }

  const parsed = schema.safeParse({
    email:    formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  try {
    await signIn("credentials", {
      email:    parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email atau password salah" }
        default:
          return { error: "Terjadi kesalahan. Silakan coba lagi." }
      }
    }
    throw error
  }

  // Login sukses → sinkronkan cookie bahasa dari preferensi akun (lintas perangkat).
  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { locale: true },
  })
  if (user && isLocale(user.locale)) {
    const cookieStore = await cookies()
    cookieStore.set(LOCALE_COOKIE, user.locale, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    })
  }

  redirect("/dashboard")
}
