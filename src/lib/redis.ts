import IORedis from "ioredis"

let redis: IORedis | null = null

export function getRedisClient(): IORedis {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return redis
}

export { IORedis }
