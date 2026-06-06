import { db } from "@/lib/db"
import { tenants, tenantModules } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { withSuperAdminContext } from "@/lib/db"

export default async function TenantsPage() {
  const allTenants = await withSuperAdminContext(async (tx) => {
    return tx.query.tenants.findMany({ orderBy: (t, { desc }) => [desc(t.createdAt)] })
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Tenant</h1>
          <p className="text-sm text-gray-500">{allTenants.length} perusahaan terdaftar</p>
        </div>
        <Link
          href="/tenants/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Tenant
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perusahaan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {allTenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                  Belum ada tenant. <Link href="/tenants/new" className="text-blue-600">Tambah sekarang.</Link>
                </td>
              </tr>
            ) : (
              allTenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{t.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {t.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
