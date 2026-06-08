import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  /** Path dasar tanpa query, mis. "/dashboard/employees". */
  basePath: string
  /** Query param lain yang ingin dipertahankan saat pindah halaman. */
  params?: Record<string, string | undefined>
  /** Halaman saat ini (berbasis 0). */
  page: number
  /** Apakah ada halaman berikutnya. */
  hasNext: boolean
  /** Total item (opsional) untuk label ringkasan. */
  total?: number
  /** Ukuran halaman (untuk menghitung rentang label). */
  pageSize?: number
}

export function Pagination({ basePath, params, page, hasNext, total, pageSize }: Props) {
  function hrefFor(p: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v) sp.set(k, v)
    }
    sp.set("page", String(p))
    return `${basePath}?${sp.toString()}`
  }

  const label =
    total != null && pageSize != null && total > 0
      ? `Menampilkan ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} dari ${total}`
      : null

  if (page === 0 && !hasNext) {
    // Satu halaman saja: tampilkan label ringkas bila ada, tanpa tombol.
    return label ? <p className="text-xs text-muted-foreground">{label}</p> : null
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : <span />}
      <div className="flex gap-2">
        {page > 0 ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page - 1)} />}>
            ← Sebelumnya
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>← Sebelumnya</Button>
        )}
        {hasNext ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page + 1)} />}>
            Berikutnya →
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>Berikutnya →</Button>
        )}
      </div>
    </div>
  )
}
