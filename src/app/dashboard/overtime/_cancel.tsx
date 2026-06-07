"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cancelOvertime } from "@/modules/overtime/actions"
import { Button } from "@/components/ui/button"

export default function CancelOvertimeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelOvertime(id)
          if (res.error) toast.error(res.error)
          else {
            toast.success(res.success ?? "Dibatalkan")
            router.refresh()
          }
        })
      }
    >
      Batalkan
    </Button>
  )
}
