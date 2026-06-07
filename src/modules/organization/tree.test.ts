import { describe, it, expect } from "vitest"
import { buildOrgTree, countOrgNodes } from "./tree"

const emp = (id: string, name: string, reportsToId: string | null) => ({
  id,
  name,
  position: null,
  department: null,
  reportsToId,
})

describe("buildOrgTree", () => {
  it("membangun hierarki sederhana", () => {
    const tree = buildOrgTree([
      emp("1", "CEO", null),
      emp("2", "Manager", "1"),
      emp("3", "Staff A", "2"),
      emp("4", "Staff B", "2"),
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe("CEO")
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].name).toBe("Manager")
    expect(tree[0].children[0].children.map((c) => c.name)).toEqual(["Staff A", "Staff B"])
  })

  it("karyawan dengan atasan tidak ada di daftar menjadi root", () => {
    const tree = buildOrgTree([emp("2", "Orphan", "999")])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe("Orphan")
  })

  it("mendukung banyak root", () => {
    const tree = buildOrgTree([emp("1", "Dir A", null), emp("2", "Dir B", null)])
    expect(tree).toHaveLength(2)
  })

  it("aman terhadap self-reference", () => {
    const tree = buildOrgTree([emp("1", "Self", "1")])
    expect(tree).toHaveLength(1)
    expect(tree[0].children).toHaveLength(0)
  })

  it("countOrgNodes menghitung semua node", () => {
    const tree = buildOrgTree([
      emp("1", "CEO", null),
      emp("2", "M", "1"),
      emp("3", "S", "2"),
    ])
    expect(countOrgNodes(tree)).toBe(3)
  })
})
