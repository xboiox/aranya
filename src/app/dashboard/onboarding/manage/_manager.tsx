"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addChecklistTask,
  applyDefaultChecklist,
  toggleChecklistTask,
  deleteChecklistTask,
} from "@/modules/onboarding/actions"
import { CHECKLIST_TYPE_LABEL, type ChecklistType } from "@/modules/onboarding/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Task {
  id: string
  task: string
  isDone: boolean
}

interface Props {
  employeeId: string
  employeeName: string | null
  type: ChecklistType
  tasks: Task[]
}

export default function ChecklistManager({ employeeId, employeeName, type, tasks }: Props) {
  const [pending, startTransition] = useTransition()
  const [newTask, setNewTask] = useState("")
  const router = useRouter()

  const done = tasks.filter((t) => t.isDone).length
  const total = tasks.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  function run(fn: () => Promise<{ error?: string; success?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        onOk?.()
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {CHECKLIST_TYPE_LABEL[type]} — {employeeName ?? "Karyawan"}
        </CardTitle>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{done} / {total} selesai</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {tasks.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Belum ada tugas. Tambahkan manual atau terapkan checklist standar.
            </li>
          ) : (
            tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={t.isDone}
                    disabled={pending}
                    onChange={() => run(() => toggleChecklistTask(t.id))}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className={t.isDone ? "text-muted-foreground line-through" : ""}>{t.task}</span>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => deleteChecklistTask(t.id))}
                >
                  Hapus
                </Button>
              </li>
            ))
          )}
        </ul>

        <div className="flex gap-2">
          <Input
            placeholder="Tambah tugas baru…"
            value={newTask}
            disabled={pending}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTask.trim()) {
                e.preventDefault()
                const fd = new FormData()
                fd.set("employeeId", employeeId)
                fd.set("type", type)
                fd.set("task", newTask)
                run(() => addChecklistTask({}, fd), () => setNewTask(""))
              }
            }}
          />
          <Button
            disabled={pending || !newTask.trim()}
            onClick={() => {
              const fd = new FormData()
              fd.set("employeeId", employeeId)
              fd.set("type", type)
              fd.set("task", newTask)
              run(() => addChecklistTask({}, fd), () => setNewTask(""))
            }}
          >
            Tambah
          </Button>
        </div>

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => applyDefaultChecklist(employeeId, type))}
        >
          Terapkan checklist standar
        </Button>
      </CardContent>
    </Card>
  )
}
