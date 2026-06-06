"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cancelLeave } from "@/modules/leave/actions"
import { Button } from "@/components/ui/button"

export default function CancelLeaveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handle() {
    startTransition(async () => {
      const res = await cancelLeave(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Dibatalkan")
        router.refresh()
      }
    })
  }

  return (
    <Button variant="ghost" size="xs" disabled={pending} onClick={handle}>
      Batalkan
    </Button>
  )
}
