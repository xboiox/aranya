"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Maaf, terjadi kesalahan tak terduga. Tim kami sudah dicatat.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Coba lagi</Button>
        <Button variant="outline" render={<a href="/dashboard" />}>
          Ke Dashboard
        </Button>
      </div>
    </main>
  )
}
