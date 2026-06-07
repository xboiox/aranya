import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listOrgEmployees } from "@/modules/organization/queries"
import { buildOrgTree, type OrgNode } from "@/modules/organization/tree"

function TreeNode({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
        style={{ marginLeft: depth * 20 }}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {(node.name ?? "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{node.name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {node.position ?? "—"}
            {node.department ? ` · ${node.department}` : ""}
          </p>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l pl-2">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default async function OrganizationPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!session.user.tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }

  const employees = await listOrgEmployees(session.user.tenantId)
  const tree = buildOrgTree(employees)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Struktur Organisasi</h1>
        <p className="text-sm text-muted-foreground">
          Hierarki pelaporan kerja ({employees.length} karyawan aktif).
        </p>
      </div>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data karyawan.</p>
      ) : (
        <ul className="space-y-2">
          {tree.map((n) => (
            <TreeNode key={n.id} node={n} depth={0} />
          ))}
        </ul>
      )}
    </div>
  )
}
