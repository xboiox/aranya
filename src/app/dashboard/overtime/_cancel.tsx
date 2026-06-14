"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { cancelOvertime } from "@/modules/overtime/actions"
import { Button } from "@/components/ui/button"

export default function CancelOvertimeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations()
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
            toast.success(res.success ?? t("requestStatus.cancelled"))
            router.refresh()
          }
        })
      }
    >
      {t("overtime.cancel")}
    </Button>
  )
}
