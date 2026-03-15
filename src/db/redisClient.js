import { Redis } from 'ioredis'
import { ENV } from '../util/env.js'
import logger from '../util/logger.js'

const redis = new Redis(
  ENV.REDIS_URL,
  {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  },
  {
    lazyConnect: true,
  }
)

redis.on('connect', async () => {
  logger.info('Redis connected Successfully.')
  try {
    await redis.config('SET', 'maxmemory', '256mb')
    await redis.config('SET', 'maxmemory-policy', 'allkeys-lru')

    logger.info('Redis Eviction Policy set to: allkeys-lru')
  } catch (err) {
    logger.warn('Could not set Redis config (Normal for some managed services):', err.message)
  }
})
redis.on('error', (err) => logger.error('Redis connection Error:', err))

export default redis
