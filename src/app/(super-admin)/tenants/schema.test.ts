import { describe, it, expect } from "vitest"
import { createTenantSchema } from "./schema"

describe("createTenantSchema", () => {
  it("menerima input valid tanpa modul (checkbox null)", () => {
    // Regresi: checkbox tak dicentang → formData.get = null
    const r = createTenantSchema.safeParse({
      name: "PT Contoh",
      slug: "pt-contoh",
      hrAdminEmail: "hr@contoh.com",
      module2: null,
      module3: null,
    })
    expect(r.success).toBe(true)
  })

  it("menerima modul tercentang ('on')", () => {
    const r = createTenantSchema.safeParse({
      name: "PT Contoh",
      slug: "pt-contoh",
      hrAdminEmail: "hr@contoh.com",
      module2: "on",
      module3: null,
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.module2).toBe("on")
  })

  it("menolak slug dengan karakter tidak valid", () => {
    const r = createTenantSchema.safeParse({
      name: "PT Contoh",
      slug: "PT Contoh!",
      hrAdminEmail: "hr@contoh.com",
    })
    expect(r.success).toBe(false)
  })

  it("menolak email tidak valid", () => {
    const r = createTenantSchema.safeParse({
      name: "PT Contoh",
      slug: "pt-contoh",
      hrAdminEmail: "bukan-email",
    })
    expect(r.success).toBe(false)
  })

  it("menolak nama terlalu pendek", () => {
    const r = createTenantSchema.safeParse({
      name: "P",
      slug: "pt-contoh",
      hrAdminEmail: "hr@contoh.com",
    })
    expect(r.success).toBe(false)
  })
})
