import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./routing"

/**
 * Resolusi locale per-request.
 *
 * Prioritas: cookie `NEXT_LOCALE` → default (`en`).
 * Cookie disinkronkan dari preferensi user (`users.locale`) saat login / toggle,
 * sehingga di sini cukup membaca cookie tanpa query DB tiap request.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
