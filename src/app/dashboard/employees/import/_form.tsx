"use client"
import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { bulkCreateEmployees } from "@/modules/employees/actions"
import { Button } from "@/components/ui/button"

export default function BulkImportForm() {
  const [state, formAction, isPending] = useActionState(bulkCreateEmployees, {})
  const router = useRouter()

  const failures = state.failures ?? []
  const done = state.created != null

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Mengimpor…" : "Impor"}
        </Button>
      </form>

      {done && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium text-emerald-700">
            {state.created} karyawan berhasil diimpor & diundang.
          </p>
          {failures.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-destructive">
                {failures.length} baris gagal:
              </p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {failures.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.ref}</span>: {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada baris yang gagal.</p>
          )}
          {(state.created ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/employees")}>
              Lihat daftar karyawan
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
