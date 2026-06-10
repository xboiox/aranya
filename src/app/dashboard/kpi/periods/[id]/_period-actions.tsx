"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  activatePeriod,
  deletePeriod,
  startAppraisal,
  lockPeriod,
} from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"

export default function PeriodActions({ periodId, status }: { periodId: string; status: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        after?.()
        router.refresh()
      }
    })
  }

  if (status === "planning") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => run(() => activatePeriod(periodId))}>
          Aktifkan periode
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => deletePeriod(periodId), () => router.push("/dashboard/kpi/periods"))}
        >
          Hapus periode
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Aktivasi butuh semua KPI tiap karyawan total bobot 100% & sudah disetujui.
        </p>
      </div>
    )
  }

  if (status === "active") {
    return (
      <div className="space-y-2">
        <Button disabled={pending} onClick={() => run(() => startAppraisal(periodId))}>
          Mulai tahap penilaian
        </Button>
        <p className="text-xs text-muted-foreground">
          Menutup input progres; membuka self-assessment & penilaian manajer.
        </p>
      </div>
    )
  }

  if (status === "appraisal") {
    return (
      <div className="space-y-2">
        <Button disabled={pending} onClick={() => run(() => lockPeriod(periodId))}>
          Kunci periode
        </Button>
        <p className="text-xs text-muted-foreground">
          Penguncian butuh semua KPI sudah dinilai manajer. Setelah terkunci, HR dapat mengkalibrasi skor akhir.
        </p>
      </div>
    )
  }

  return <p className="text-sm text-muted-foreground">Periode terkunci — penilaian final & kalibrasi di halaman KPI Tim.</p>
}
