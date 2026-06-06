import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/invite"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 2FA: jika sudah login tapi belum verify 2FA, redirect ke /2fa
  // startsWith("/2fa") agar sub-routes seperti /2fa/setup tidak terjebak loop
  if (req.auth && !req.auth.user.isTwoFactorVerified && !pathname.startsWith("/2fa")) {
    const roles = req.auth.user.roles ?? []
    const requires2FA = roles.includes("super_admin") || roles.includes("hr_admin")
    if (requires2FA) {
      return NextResponse.redirect(new URL("/2fa", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
