"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { cancelLeave } from "@/modules/leave/actions"
import { Button } from "@/components/ui/button"

export default function CancelLeaveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations()

  function handle() {
    startTransition(async () => {
      const res = await cancelLeave(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? t("requestStatus.cancelled"))
        router.refresh()
      }
    })
  }

  return (
    <Button variant="ghost" size="xs" disabled={pending} onClick={handle}>
      {t("leave.cancel")}
    </Button>
  )
}
