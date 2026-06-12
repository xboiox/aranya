"use server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { isLocale, LOCALE_COOKIE, type Locale } from "./routing"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Mengubah preferensi bahasa pengguna.
 * - Selalu set cookie `NEXT_LOCALE` (sumber runtime untuk next-intl).
 * - Bila login, persist ke `users.locale` agar konsisten lintas perangkat.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    throw new Error("Locale tidak valid")
  }

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  })

  // users bukan tabel ber-RLS → update langsung aman.
  const session = await auth()
  if (session?.user?.id) {
    await db.update(users).set({ locale }).where(eq(users.id, session.user.id))
  }

  revalidatePath("/", "layout")
}
