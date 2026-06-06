import { describe, it, expect } from "vitest"
import {
  requestLeaveSchema,
  leaveTypeLabel,
  affectsQuota,
} from "./schema"

describe("requestLeaveSchema", () => {
  it("menerima pengajuan valid", () => {
    const r = requestLeaveSchema.safeParse({
      type: "annual",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      reason: "Liburan keluarga",
    })
    expect(r.success).toBe(true)
  })

  it("menolak end date sebelum start date", () => {
    const r = requestLeaveSchema.safeParse({
      type: "annual",
      startDate: "2026-06-10",
      endDate: "2026-06-01",
    })
    expect(r.success).toBe(false)
  })

  it("menolak jenis cuti tidak valid", () => {
    const r = requestLeaveSchema.safeParse({
      type: "liburan",
      startDate: "2026-06-01",
      endDate: "2026-06-02",
    })
    expect(r.success).toBe(false)
  })
})

describe("leaveTypeLabel & affectsQuota", () => {
  it("label sesuai", () => {
    expect(leaveTypeLabel("annual")).toBe("Cuti Tahunan")
    expect(leaveTypeLabel("sick")).toBe("Sakit")
  })

  it("hanya cuti tahunan mengurangi kuota", () => {
    expect(affectsQuota("annual")).toBe(true)
    expect(affectsQuota("sick")).toBe(false)
    expect(affectsQuota("permission")).toBe(false)
  })
})
