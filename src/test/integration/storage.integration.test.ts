import { describe, it, expect } from "vitest"
import { putObject, getObject, deleteObject } from "@/lib/storage"

describe("storage abstraction (backend lokal di dev)", () => {
  const key = `test/${crypto.randomUUID()}.pdf`
  const content = Buffer.from("%PDF-1.4 dummy payslip content")

  it("put → get mengembalikan konten yang sama", async () => {
    await putObject(key, content, "application/pdf")
    const got = await getObject(key)
    expect(got).not.toBeNull()
    expect(got!.equals(content)).toBe(true)
  })

  it("delete menghapus objek (get → null)", async () => {
    await deleteObject(key)
    const got = await getObject(key)
    expect(got).toBeNull()
  })

  it("get pada key tidak ada → null (tidak melempar)", async () => {
    const got = await getObject(`test/${crypto.randomUUID()}.pdf`)
    expect(got).toBeNull()
  })
})
