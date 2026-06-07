export interface OrgEmployee {
  id: string
  name: string | null
  position: string | null
  department: string | null
  reportsToId: string | null
}

export interface OrgNode extends OrgEmployee {
  children: OrgNode[]
}

/**
 * Bangun pohon hierarki dari daftar karyawan berdasarkan reportsToId.
 * - Root = karyawan tanpa atasan (reportsToId null) ATAU atasan tidak ada di daftar (mis. nonaktif).
 * - Aman terhadap cycle (karyawan yang sudah ter-assign tidak diproses ulang sebagai root).
 */
export function buildOrgTree(employees: OrgEmployee[]): OrgNode[] {
  const nodes = new Map<string, OrgNode>()
  for (const e of employees) {
    nodes.set(e.id, { ...e, children: [] })
  }

  const roots: OrgNode[] = []
  const assigned = new Set<string>()

  for (const e of employees) {
    const node = nodes.get(e.id)!
    const parent = e.reportsToId ? nodes.get(e.reportsToId) : undefined
    if (parent && parent.id !== e.id) {
      parent.children.push(node)
      assigned.add(e.id)
    }
  }

  for (const e of employees) {
    if (!assigned.has(e.id)) roots.push(nodes.get(e.id)!)
  }

  // Urutkan anak by nama untuk tampilan stabil
  const sortRec = (n: OrgNode) => {
    n.children.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    n.children.forEach(sortRec)
  }
  roots.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
  roots.forEach(sortRec)

  return roots
}

/** Hitung total node dalam pohon (untuk validasi/info). */
export function countOrgNodes(roots: OrgNode[]): number {
  let n = 0
  const walk = (node: OrgNode) => {
    n++
    node.children.forEach(walk)
  }
  roots.forEach(walk)
  return n
}
