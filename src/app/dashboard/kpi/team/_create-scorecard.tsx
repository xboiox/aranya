"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createScorecard } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"

export default function CreateScorecardButton({ periodId, employeeId }: { periodId: string; employeeId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await createScorecard(periodId, employeeId)
          if (res.error) toast.error(res.error)
          else { toast.success(res.success ?? "Dibuat"); router.refresh() }
        })
      }
    >
      Buat scorecard
    </Button>
  )
}
