import { Storage } from "@google-cloud/storage"

function createStorageClient(): Storage {
  const base64 = process.env.GCS_CREDENTIALS_BASE64
  if (!base64) throw new Error("GCS_CREDENTIALS_BASE64 is not configured")

  const credentials = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8"),
  )

  return new Storage({ projectId: process.env.GCS_PROJECT_ID, credentials })
}

const storage = createStorageClient()
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

const EXPIRY_MINUTES = parseInt(
  process.env.GCS_SIGNED_URL_EXPIRY_MINUTES ?? "15",
)

export async function getSignedUrl(filePath: string): Promise<string> {
  const [url] = await bucket.file(filePath).getSignedUrl({
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
  await bucket.file(filePath).save(buffer, { contentType })
}

export async function deleteFile(filePath: string): Promise<void> {
  await bucket.file(filePath).delete({ ignoreNotFound: true })
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
}
