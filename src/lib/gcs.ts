import { Storage } from "@google-cloud/storage"

let _storage: Storage | null = null
let _bucket: ReturnType<Storage["bucket"]> | null = null

const EXPIRY_MINUTES = parseInt(
  process.env.GCS_SIGNED_URL_EXPIRY_MINUTES ?? "15",
)

// GCS dianggap dikonfigurasi jika credentials & bucket terisi (bukan placeholder)
export function isGcsConfigured(): boolean {
  const cred = process.env.GCS_CREDENTIALS_BASE64
  const bucket = process.env.GCS_BUCKET_NAME
  return (
    !!cred &&
    !cred.includes("BASE64_ENCODED") &&
    !!bucket
  )
}

// Lazy init — tidak crash saat startup jika GCS belum dikonfigurasi (e.g. local dev)
function getStorage(): Storage {
  if (!_storage) {
    const base64 = process.env.GCS_CREDENTIALS_BASE64
    if (!base64) throw new Error("GCS_CREDENTIALS_BASE64 is not configured")
    const credentials = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"))
    _storage = new Storage({ projectId: process.env.GCS_PROJECT_ID, credentials })
  }
  return _storage
}

function getBucket() {
  if (!_bucket) {
    const bucketName = process.env.GCS_BUCKET_NAME
    if (!bucketName) throw new Error("GCS_BUCKET_NAME is not configured")
    _bucket = getStorage().bucket(bucketName)
  }
  return _bucket
}

export async function getSignedUrl(filePath: string): Promise<string> {
  const [url] = await getBucket().file(filePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + EXPIRY_MINUTES * 60 * 1000,
  })
  return url
}

export async function uploadFile(
  filePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getBucket().file(filePath).save(buffer, { contentType })
}

export async function downloadFile(filePath: string): Promise<Buffer> {
  const [buf] = await getBucket().file(filePath).download()
  return buf
}

export async function deleteFile(filePath: string): Promise<void> {
  await getBucket().file(filePath).delete({ ignoreNotFound: true })
}

export const GCS_PATHS = {
  payslip: (tenantId: string, year: number, month: number, employeeId: string) =>
    `payslips/${tenantId}/${year}/${String(month).padStart(2, "0")}/${employeeId}.pdf`,
  document: (tenantId: string, employeeId: string, docType: string, filename: string) =>
    `documents/${tenantId}/${employeeId}/${docType}/${filename}`,
  claim: (tenantId: string, claimId: string, filename: string) =>
    `claims/${tenantId}/${claimId}/${filename}`,
  asset: (tenantId: string, assetId: string, filename: string) =>
    `assets/${tenantId}/${assetId}/${filename}`,
  kpiEvidence: (tenantId: string, kpiId: string, filename: string) =>
    `kpi-evidence/${tenantId}/${kpiId}/${filename}`,
}
