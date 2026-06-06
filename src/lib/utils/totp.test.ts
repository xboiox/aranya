import { describe, it, expect } from "vitest"
import { authenticator } from "@otplib/preset-default"
import {
  generateTotpSecret,
  verifyTotpToken,
  generateBackupCodes,
} from "./totp"

describe("totp", () => {
  it("menerima token valid yang dihasilkan dari secret", () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    expect(verifyTotpToken(token, secret)).toBe(true)
  })

  it("menolak token dari secret berbeda", () => {
    const secretA = generateTotpSecret()
    const secretB = generateTotpSecret()
    const tokenA = authenticator.generate(secretA)
    expect(verifyTotpToken(tokenA, secretB)).toBe(false)
  })

  it("generateTotpSecret menghasilkan secret non-kosong yang unik", () => {
    const a = generateTotpSecret()
    const b = generateTotpSecret()
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })

  describe("generateBackupCodes", () => {
    it("menghasilkan 8 kode secara default", () => {
      expect(generateBackupCodes()).toHaveLength(8)
    })

    it("semua kode unik dan uppercase alfanumerik", () => {
      const codes = generateBackupCodes(8)
      expect(new Set(codes).size).toBe(8)
      codes.forEach((c) => expect(c).toMatch(/^[0-9A-Z]+$/))
    })

    it("menghormati jumlah yang diminta", () => {
      expect(generateBackupCodes(5)).toHaveLength(5)
    })
  })
})
