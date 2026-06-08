import { describe, it, expect } from "vitest"
import { authorizeApproval } from "./approval-auth"

const base = {
  requesterUserId: "user-req",
  requesterReportsToId: "emp-lead",
  actorUserId: "user-lead",
  actorEmployeeId: "emp-lead",
  actorIsHr: false,
}

describe("authorizeApproval", () => {
  it("mengizinkan atasan langsung pemohon", () => {
    expect(authorizeApproval(base)).toBeNull()
  })

  it("mengizinkan HR Admin meski bukan atasan langsung", () => {
    expect(
      authorizeApproval({
        ...base,
        actorEmployeeId: "emp-hr",
        actorUserId: "user-hr",
        actorIsHr: true,
      }),
    ).toBeNull()
  })

  it("menolak aktor yang bukan atasan langsung maupun HR", () => {
    expect(
      authorizeApproval({
        ...base,
        actorEmployeeId: "emp-other",
        actorUserId: "user-other",
        actorIsHr: false,
      }),
    ).toBe("Anda tidak berwenang memproses pengajuan ini")
  })

  it("menolak persetujuan pengajuan sendiri walau HR", () => {
    expect(
      authorizeApproval({
        ...base,
        requesterUserId: "user-hr",
        actorUserId: "user-hr",
        actorEmployeeId: "emp-hr",
        actorIsHr: true,
      }),
    ).toBe("Anda tidak dapat menyetujui pengajuan sendiri")
  })

  it("menolak aktor tanpa record karyawan (actorEmployeeId null) dan bukan HR", () => {
    expect(
      authorizeApproval({ ...base, actorEmployeeId: null, actorUserId: "user-x", actorIsHr: false }),
    ).toBe("Anda tidak berwenang memproses pengajuan ini")
  })

  it("tidak menganggap atasan langsung bila pemohon tak punya atasan (reportsToId null)", () => {
    expect(
      authorizeApproval({
        ...base,
        requesterReportsToId: null,
        actorEmployeeId: null,
        actorUserId: "user-other",
        actorIsHr: false,
      }),
    ).toBe("Anda tidak berwenang memproses pengajuan ini")
  })
})
