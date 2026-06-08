const STATUS_LABEL: Record<string, string> = {
  approved: "Disetujui",
  rejected: "Ditolak",
}

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
}

export interface ApprovalHistoryItem {
  id: string
  requesterName: string
  detail: string
  status: string
  decidedAt: string | null
  rejectionReason: string | null
}

export function ApprovalHistory({
  items,
  title = "Riwayat",
}: {
  items: ApprovalHistoryItem[]
  title?: string
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
          Belum ada riwayat.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">{it.requesterName}</p>
                <p className="text-muted-foreground">{it.detail}</p>
                {it.status === "rejected" && it.rejectionReason && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Alasan: {it.rejectionReason}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLE[it.status] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {STATUS_LABEL[it.status] ?? it.status}
                </span>
                {it.decidedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">{it.decidedAt}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
