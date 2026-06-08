import { describe, it, expect } from "vitest"
import { parseEmployeeCsv, EMPLOYEE_CSV_TEMPLATE } from "./bulk"

const HEADER = "email,name,role,position,department,contractType,joinDate,reportsToEmail"

describe("parseEmployeeCsv", () => {
  it("mem-parse baris valid + default role employee", () => {
    const csv = `${HEADER}\nbudi@x.com,Budi,,Staff,Finance,PKWT,2026-01-15,`
    const res = parseEmployeeCsv(csv)
    expect(res.errors).toHaveLength(0)
    expect(res.valid).toHaveLength(1)
    expect(res.valid[0]).toMatchObject({
      email: "budi@x.com",
      name: "Budi",
      role: "employee",
      department: "Finance",
      contractType: "PKWT",
      joinDate: "2026-01-15",
    })
    expect(res.valid[0].position).toBe("Staff")
    expect(res.valid[0].reportsToEmail).toBeUndefined()
  })

  it("menurunkan email & role ke lowercase", () => {
    const res = parseEmployeeCsv(`${HEADER}\nBUDI@X.com,Budi,MANAGER,,,,, `)
    expect(res.valid[0].email).toBe("budi@x.com")
    expect(res.valid[0].role).toBe("manager")
  })

  it("mencatat error email tidak valid dengan nomor baris", () => {
    const res = parseEmployeeCsv(`${HEADER}\nbukan-email,Budi,,,,,,`)
    expect(res.valid).toHaveLength(0)
    expect(res.errors[0]).toMatchObject({ line: 2 })
    expect(res.errors[0].message).toMatch(/email/i)
  })

  it("menolak role tidak dikenal", () => {
    const res = parseEmployeeCsv(`${HEADER}\nbudi@x.com,Budi,boss,,,,,`)
    expect(res.errors[0].message).toMatch(/Role/)
  })

  it("menolak contractType & joinDate tidak valid", () => {
    expect(parseEmployeeCsv(`${HEADER}\nb@x.com,Budi,,,, FULLTIME,,`).errors[0].message).toMatch(/contractType/)
    expect(parseEmployeeCsv(`${HEADER}\nb@x.com,Budi,,,,,15-01-2026,`).errors[0].message).toMatch(/joinDate/)
  })

  it("mendeteksi email duplikat dalam file", () => {
    const csv = `${HEADER}\nb@x.com,Budi,,,,,,\nb@x.com,Budi2,,,,,,`
    const res = parseEmployeeCsv(csv)
    expect(res.valid).toHaveLength(1)
    expect(res.errors[0].message).toMatch(/duplikat/i)
  })

  it("header tanpa kolom wajib → headerError", () => {
    const res = parseEmployeeCsv("foo,bar\n1,2")
    expect(res.headerError).toBeDefined()
    expect(res.valid).toHaveLength(0)
  })

  it("header boleh beda urutan", () => {
    const res = parseEmployeeCsv("name,email\nBudi,budi@x.com")
    expect(res.valid).toHaveLength(1)
    expect(res.valid[0]).toMatchObject({ email: "budi@x.com", name: "Budi", role: "employee" })
  })

  it("template bawaan valid (3 baris contoh)", () => {
    const res = parseEmployeeCsv(EMPLOYEE_CSV_TEMPLATE)
    expect(res.errors).toHaveLength(0)
    expect(res.valid).toHaveLength(3)
    expect(res.valid[2].reportsToEmail).toBe("sari@contoh.com")
  })
})
