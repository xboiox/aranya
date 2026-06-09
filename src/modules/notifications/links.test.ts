import { describe, it, expect } from "vitest"
import { notificationHref } from "./links"

describe("notificationHref", () => {
  it("mengarahkan pengajuan masuk ke inbox persetujuan", () => {
    expect(notificationHref("leave_request")).toBe("/dashboard/leave/approvals")
    expect(notificationHref("overtime_request")).toBe("/dashboard/overtime/approvals")
  })

  it("mengarahkan keputusan ke halaman pemohon", () => {
    expect(notificationHref("leave_approved")).toBe("/dashboard/leave")
    expect(notificationHref("leave_rejected")).toBe("/dashboard/leave")
    expect(notificationHref("overtime_approved")).toBe("/dashboard/overtime")
  })

  it("mengembalikan null untuk tipe tanpa halaman terkait", () => {
    expect(notificationHref("email")).toBeNull()
    expect(notificationHref("password")).toBeNull()
    expect(notificationHref("unknown_type")).toBeNull()
  })
})
