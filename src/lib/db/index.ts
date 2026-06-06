import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import { sql } from "drizzle-orm"

const client = postgres(process.env.DATABASE_URL!, { max: 10 })
export const db = drizzle(client, { schema })

export type Database = typeof db

/**
 * Wrap queries dalam tenant context untuk enforce RLS.
 * Wajib dipakai di semua server actions dan API routes.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`)
    return fn(tx as unknown as Database)
  })
}

/**
 * Wrap queries untuk Super Admin — bypass RLS.
 * Hanya dipakai di Super Admin routes.
 */
export async function withSuperAdminContext<T>(
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.bypass_rls', 'on', true)`)
    return fn(tx as unknown as Database)
  })
}
