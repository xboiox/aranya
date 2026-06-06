import { withTenantContext } from "@/lib/db"
import { holidays } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { toYMD } from "@/lib/date"

export type HolidayRow = typeof holidays.$inferSelect

export async function listHolidays(tenantId: string): Promise<HolidayRow[]> {
  // RLS membatasi ke libur nasional (tenant_id null) + libur tenant ini
  return withTenantContext(tenantId, async (tx) => {
    return tx.select().from(holidays).orderBy(asc(holidays.date))
  })
}

/**
 * Set tanggal libur ("YYYY-MM-DD") dalam rentang [start, end].
 * Libur recurring diproyeksikan ke setiap tahun dalam rentang (cocokkan bulan-tanggal).
 */
export async function getHolidayDateSet(
  tenantId: string,
  start: Date,
  end: Date,
): Promise<Set<string>> {
  const rows = await listHolidays(tenantId)
  const result = new Set<string>()
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()

  for (const h of rows) {
    const hd = new Date(h.date)
    if (h.isRecurring) {
      const mm = String(hd.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(hd.getUTCDate()).padStart(2, "0")
      for (let y = startYear; y <= endYear; y++) {
        const candidate = new Date(`${y}-${mm}-${dd}T00:00:00.000Z`)
        if (candidate >= start && candidate <= end) result.add(toYMD(candidate))
      }
    } else {
      if (hd >= start && hd <= end) result.add(toYMD(hd))
    }
  }
  return result
}
