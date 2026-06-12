import { Redis } from '@upstash/redis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

const rawRedis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy',
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = rawRedis

export const redis = new Proxy(rawRedis, {
  get(target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = (target as any)[prop]
    if (typeof originalMethod === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return async (...args: any[]) => {
        try {
          // Fast-fail if using dummy URL to prevent fetch hanging or errors
          if (!process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL.includes('dummy')) {
            if (prop === 'keys') return []
            return null
          }
          return await originalMethod.apply(target, args)
        } catch (error) {
          console.warn(`[Redis Mock] Suppressed error for redis.${String(prop)}:`, (error as Error).message)
          if (prop === 'keys') return []
          return null
        }
      }
    }
    return originalMethod
  },
}) as Redis

export default redis
