"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deletePayslip } from "@/modules/payslip/actions"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function DeletePayslipButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deletePayslip(id)
          if (res.error) toast.error(res.error)
          else {
            toast.success(res.success ?? "Dihapus")
            router.refresh()
          }
        })
      }
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  )
}
