"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { assignAsset, deleteAsset } from "@/modules/asset/actions"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
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
        <Select
          className="w-full"
          defaultValue={assignedToId ?? ""}
          disabled={pending}
          onChange={(e) => run(() => assignAsset(id, e.target.value))}
        >
          <option value="">— Tersedia —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name ?? "—"}</option>
          ))}
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => run(() => deleteAsset(id))}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
