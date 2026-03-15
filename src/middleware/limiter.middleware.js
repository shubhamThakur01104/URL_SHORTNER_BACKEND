import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import redis from '../db/redisClient.js'

export const redirectLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl-red:',
  }),
  windowMs: 1 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    statusCode: 429,
  },
})

export const reportLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl-report:',
  }),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests, please try again later.',
  },
})

export const createLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl-create:',
  }),
  windowMs: 1 * 60 * 1000,
  limit: 50,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests, please try again later.',
  },
})
