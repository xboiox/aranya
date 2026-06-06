import { authenticator } from "@otplib/preset-default"
import QRCode from "qrcode"

const ISSUER = "Aranya HRIS"

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export async function generateQrCodeDataUrl(
  email: string,
  secret: string,
): Promise<string> {
  const otpAuthUrl = authenticator.keyuri(email, ISSUER, secret)
  return QRCode.toDataURL(otpAuthUrl)
}

export function verifyTotpToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret })
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase(),
  )
}
