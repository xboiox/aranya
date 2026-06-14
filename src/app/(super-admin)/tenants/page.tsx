import Link from "next/link"
import { withSuperAdminContext } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function TenantsPage() {
  const allTenants = await withSuperAdminContext(async (tx) => {
    return tx.query.tenants.findMany({ orderBy: (t, { desc }) => [desc(t.createdAt)] })
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Tenant</h1>
          <p className="text-sm text-muted-foreground">{allTenants.length} perusahaan terdaftar</p>
        </div>
        <Button render={<Link href="/tenants/new" />}>+ Tambah Tenant</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Perusahaan</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bergabung</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allTenants.length === 0 ? (
            <TableEmpty colSpan={4}>
              Belum ada tenant.{" "}
              <Link href="/tenants/new" className="text-primary underline">
                Tambah sekarang.
              </Link>
            </TableEmpty>
          ) : (
            allTenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link href={`/tenants/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">{t.slug}</TableCell>
                <TableCell>
                  <Badge variant={t.isActive ? "success" : "muted"}>{t.subscriptionStatus}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("id-ID")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
