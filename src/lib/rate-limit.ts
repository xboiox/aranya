import { headers } from "next/headers"
import { getRedisClient } from "@/lib/redis"

export async function getClientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  )
}

export interface RateLimitResult {
  success: boolean
  resetIn: number // detik tersisa sampai window reset
}

/**
 * Rate limit fixed-window berbasis Redis, di-key per IP + action.
 * Fail-open: jika Redis tidak tersedia, JANGAN blokir (availability > strict),
 * tapi log error agar terdeteksi.
 */
export async function rateLimit(
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const ip = await getClientIp()
    const redis = getRedisClient()
    const key = `ratelimit:${action}:${ip}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    const ttl = await redis.ttl(key)

    return {
      success: count <= limit,
      resetIn: ttl > 0 ? ttl : windowSeconds,
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rate-limit] Redis error, fail-open:", err)
    return { success: true, resetIn: 0 }
  }
}
