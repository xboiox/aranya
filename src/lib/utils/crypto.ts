import crypto from "crypto"

// AES-256-GCM encryption untuk data sensitif at rest (mis. TOTP secret).
// Format ciphertext tersimpan: "iv:authTag:ciphertext" (semua hex).

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM standard nonce length

function getKey(): Buffer {
  const hexKey = process.env.AUTH_ENCRYPTION_KEY
  if (!hexKey) {
    throw new Error("AUTH_ENCRYPTION_KEY is not configured")
  }
  const key = Buffer.from(hexKey, "hex")
  if (key.length !== 32) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY harus 32 byte (64 karakter hex). Generate: openssl rand -hex 32",
    )
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    throw new Error("Format ciphertext tidak valid")
  }
  const [ivHex, authTagHex, dataHex] = parts
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex"),
  )
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
