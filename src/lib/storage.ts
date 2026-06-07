import path from "path"
import { promises as fs } from "fs"
import {
  isGcsConfigured,
  uploadFile,
  downloadFile,
  deleteFile,
} from "@/lib/gcs"

// Abstraksi storage dengan dua backend:
// - GCS (produksi) saat GCS_CREDENTIALS_BASE64 + bucket dikonfigurasi
// - Filesystem lokal (.uploads/, dev fallback) saat GCS belum diset
// Otorisasi download dilakukan di route handler, bukan via signed URL.

const LOCAL_DIR = path.join(process.cwd(), ".uploads")

function localPath(key: string): string {
  // Cegah path traversal
  const safe = key.replace(/\.\./g, "").replace(/^\/+/, "")
  return path.join(LOCAL_DIR, safe)
}

export async function putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  if (isGcsConfigured()) {
    await uploadFile(key, buffer, contentType)
    return
  }
  const dest = localPath(key)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, buffer)
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    if (isGcsConfigured()) {
      return await downloadFile(key)
    }
    return await fs.readFile(localPath(key))
  } catch {
    return null
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (isGcsConfigured()) {
    await deleteFile(key)
    return
  }
  try {
    await fs.unlink(localPath(key))
  } catch {
    // abaikan jika file tidak ada
  }
}
