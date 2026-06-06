import { describe, it, expect, beforeAll } from "vitest"
import { encrypt, decrypt } from "./crypto"

describe("crypto (AES-256-GCM)", () => {
  beforeAll(() => {
    // 32-byte key dalam hex (64 karakter)
    process.env.AUTH_ENCRYPTION_KEY = "a".repeat(64)
  })

  it("encrypt lalu decrypt mengembalikan plaintext asli", () => {
    const plaintext = "JBSWY3DPEHPK3PXP" // contoh TOTP secret
    const encrypted = encrypt(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it("menghasilkan ciphertext berbeda untuk input yang sama (IV acak)", () => {
    const plaintext = "secret-value"
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })

  it("menghasilkan format iv:authTag:ciphertext (3 bagian hex)", () => {
    const parts = encrypt("x").split(":")
    expect(parts).toHaveLength(3)
    parts.forEach((p) => expect(p).toMatch(/^[0-9a-f]+$/))
  })

  it("menolak ciphertext yang dimodifikasi (auth tag mismatch)", () => {
    const encrypted = encrypt("tamper-me")
    const [iv, tag, data] = encrypted.split(":")
    const flipped = data.slice(0, -1) + (data.slice(-1) === "0" ? "1" : "0")
    expect(() => decrypt(`${iv}:${tag}:${flipped}`)).toThrow()
  })

  it("menolak format ciphertext yang tidak valid", () => {
    expect(() => decrypt("bukan-format-valid")).toThrow("Format ciphertext tidak valid")
  })
})
