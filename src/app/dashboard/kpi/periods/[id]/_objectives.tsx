"use client"
import { useActionState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addObjective, deleteObjective } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Objective {
  id: string
  title: string
  description: string | null
}

interface Props {
  periodId: string
  editable: boolean
  objectives: Objective[]
}

export default function ObjectivesPanel({ periodId, editable, objectives }: Props) {
  const [state, formAction, isPending] = useActionState(addObjective, {})
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.success, router])

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteObjective(id, periodId)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Dihapus")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {objectives.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada target perusahaan.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {objectives.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{o.title}</p>
                {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
              </div>
              {editable && (
                <Button size="xs" variant="ghost" disabled={pending} onClick={() => remove(o.id)}>
                  Hapus
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form ref={formRef} action={formAction} className="space-y-2">
          <input type="hidden" name="periodId" value={periodId} />
          <Input name="title" placeholder="Judul target perusahaan" required />
          <Input name="description" placeholder="Deskripsi (opsional)" />
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</p>
          )}
          <Button size="sm" type="submit" disabled={isPending}>Tambah target</Button>
        </form>
      )}
    </div>
  )
}
