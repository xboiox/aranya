import { Worker } from "bullmq"
import { getRedisClient } from "@/lib/redis"

const connection = getRedisClient()

// TODO Fase 0+: Import dan register worker processors
// import { payrollProcessor } from "./payroll.worker"
// import { pdfProcessor } from "./pdf.worker"
// import { emailProcessor } from "./email.worker"

const workers: Worker[] = [
  // new Worker("payroll", payrollProcessor, { connection }),
  // new Worker("pdf", pdfProcessor, { connection }),
  // new Worker("email", emailProcessor, { connection }),
]

process.on("SIGTERM", async () => {
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
})

console.log(`[Worker] Aranya workers started — ${workers.length} active`)
