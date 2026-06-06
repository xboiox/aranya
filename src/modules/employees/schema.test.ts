import { describe, it, expect } from "vitest"
import { employeeCreateSchema, employeeUpdateSchema } from "./schema"

describe("employeeCreateSchema", () => {
  it("menerima input minimal yang valid", () => {
    const r = employeeCreateSchema.safeParse({
      email: "budi@contoh.com",
      name: "Budi Santoso",
      role: "employee",
    })
    expect(r.success).toBe(true)
  })

  it("menolak email tidak valid", () => {
    const r = employeeCreateSchema.safeParse({
      email: "bukan-email",
      name: "Budi",
      role: "employee",
    })
    expect(r.success).toBe(false)
  })

  it("menolak nama terlalu pendek", () => {
    const r = employeeCreateSchema.safeParse({
      email: "a@b.com",
      name: "B",
      role: "employee",
    })
    expect(r.success).toBe(false)
  })

  it("menolak role di luar employee/manager", () => {
    const r = employeeCreateSchema.safeParse({
      email: "a@b.com",
      name: "Budi",
      role: "hr_admin",
    })
    expect(r.success).toBe(false)
  })

  it("mengubah string kosong menjadi undefined (field opsional)", () => {
    const r = employeeCreateSchema.safeParse({
      email: "a@b.com",
      name: "Budi Santoso",
      role: "manager",
      position: "",
      reportsToId: "",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.position).toBeUndefined()
      expect(r.data.reportsToId).toBeUndefined()
    }
  })
})

describe("employeeUpdateSchema", () => {
  it("menerima master data lengkap", () => {
    const r = employeeUpdateSchema.safeParse({
      name: "Budi Santoso",
      position: "Staff",
      nik: "327101",
      isActive: true,
    })
    expect(r.success).toBe(true)
  })

  it("tetap mewajibkan nama", () => {
    const r = employeeUpdateSchema.safeParse({ name: "" })
    expect(r.success).toBe(false)
  })
})
