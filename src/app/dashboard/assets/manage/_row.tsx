"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { assignAsset, deleteAsset } from "@/modules/asset/actions"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Trash2 } from "lucide-react"

interface Props {
  id: string
  name: string
  category: string
  serialNumber: string | null
  assignedToId: string | null
  employees: { id: string; name: string | null }[]
}

const selectClass =
  "rounded-md border border-input bg-background px-2 py-1 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"

export default function AssetRow({ id, name, category, serialNumber, assignedToId, employees }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        router.refresh()
      }
    })
  }

  return (
    <TableRow>
      <TableCell>
        {name}
        <span className="block text-xs text-muted-foreground capitalize">
          {category}{serialNumber ? ` · ${serialNumber}` : ""}
        </span>
      </TableCell>
      <TableCell>
        <select
          className={selectClass}
          defaultValue={assignedToId ?? ""}
          disabled={pending}
          onChange={(e) => run(() => assignAsset(id, e.target.value))}
        >
          <option value="">— Tersedia —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name ?? "—"}</option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => run(() => deleteAsset(id))}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
