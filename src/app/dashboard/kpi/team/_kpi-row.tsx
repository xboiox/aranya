"use client"
import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateKpi, sendKpi, deleteKpi } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  id: string
  title: string
  weight: number
  target: string | null
  status: string
  statusLabel: string
  statusStyle: string
  revisionNote: string | null
  editable: boolean
}

export default function KpiRow({
  id,
  title,
  weight,
  target,
  status,
  statusLabel,
  statusStyle,
  revisionNote,
  editable,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        after?.()
        router.refresh()
      }
    })
  }

  function onSubmitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    run(() => updateKpi(id, {}, fd), () => setEditing(false))
  }

  const canEdit = editable && (status === "draft" || status === "revision_requested")

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            Bobot {weight}%{target ? ` · Target: ${target}` : ""}
          </p>
          {status === "revision_requested" && revisionNote && (
            <p className="mt-1 text-xs text-red-600">Minta revisi: {revisionNote}</p>
          )}
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      {canEdit && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="xs" variant="outline" disabled={pending} onClick={() => setEditing((v) => !v)}>
            {editing ? "Batal" : "Ubah"}
          </Button>
          <Button size="xs" disabled={pending} onClick={() => run(() => sendKpi(id))}>
            Kirim
          </Button>
          {status === "draft" && (
            <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => deleteKpi(id))}>
              Hapus
            </Button>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={onSubmitEdit} className="mt-3 space-y-2 rounded-md border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input name="title" defaultValue={title} placeholder="Judul" required />
            <Input name="weight" type="number" min={1} max={100} defaultValue={weight} required />
          </div>
          <Input name="target" defaultValue={target ?? ""} placeholder="Target (opsional)" />
          <Input name="description" placeholder="Deskripsi (opsional)" />
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </form>
      )}
    </li>
  )
}
