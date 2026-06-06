import { Worker } from "bullmq"

// TODO Fase 0+: Import dan register worker processors.
// Saat menambah worker, ambil koneksi Redis:
//   import { getRedisClient } from "@/lib/redis"
//   const connection = getRedisClient()
//   new Worker("payroll", payrollProcessor, { connection })
const workers: Worker[] = []

process.on("SIGTERM", async () => {
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
})

console.log(`[Worker] Aranya workers started — ${workers.length} active`)
