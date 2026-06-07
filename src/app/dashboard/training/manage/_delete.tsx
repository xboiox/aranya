"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteTraining } from "@/modules/training/actions"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function DeleteTrainingButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteTraining(id)
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
