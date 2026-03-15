import request from 'supertest'
import { clearDB, connectDB, disconnectDB, startRedis, stopRedis } from '../setup.js'
import Counter from '../../src/model/counter.model.js'
import { app } from '../../src/index.js'
import shortURL from '../../src/model/url.model.js'
import mongoose from 'mongoose'
import redis from '../../src/db/redisClient.js'
import Analytics from '../../src/model/analysis.model.js'
import { captureAnalytics } from '../../src/service/urlService.js'
import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'

let client

beforeAll(async () => {
  await connectDB()
  client = await startRedis()
})

beforeEach(async () => {
  await connectDB()
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await disconnectDB()
  await stopRedis()
})

afterEach(async () => {
  await client.flushall()
  jest.restoreAllMocks()
  await clearDB
})

jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip) => {
    if (ip === '1.1.1.1') return { city: 'Delhi', region: 'DL', country: 'IN' }
    return null
  }),
}))

jest.mock('ua-parser-js', () => {
  return {
    UAParser: jest.fn().mockImplementation((ua) => {
      return {
        getResult: () => {
          if (ua && ua.startsWith('Mozilla/5.0')) {
            return {
              browser: { name: 'Chrome' },
              os: { name: 'Windows' },
              device: { type: 'Desktop' },
            }
          }
          return {
            browser: {},
            os: {},
            device: {},
          }
        },
      }
    }),
  }
})

describe('Post /api/v1/url/', () => {
  const endpoint = '/api/v1/url/'

  test('Should create the shortURL', async () => {
    const validPayload = {
      orgURL: 'https://www.github.com',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const beforeCounter = await Counter.findOne({ id: 'urlCounter' })
    const initialValue = beforeCounter ? beforeCounter.counter : 0

    const response = await request(app)
      .post(endpoint)
      .send(validPayload)
      .set('Accept', 'application/json')

    const afterCounter = await Counter.findOne({ id: 'urlCounter' })

    const generatedURL = response.body.data
    const shortCode = generatedURL.split('/').pop()

    const storedData = await shortURL.findOne({ shortCode })

    expect(response.statusCode).toBe(200)
    expect(afterCounter.counter).toBe(initialValue + 1)

    expect(storedData).not.toBeNull()
    expect(storedData.orgURL).toBe(validPayload.orgURL)

    expect(response.body.success).toBe(true)
    expect(generatedURL).toContain(shortCode)
  })

  test('Should take default expiry of 30 days when expire date not provided', async () => {
    const validPayload = { orgURL: 'https://www.google.com' }

    const defaultExpiry = new Date()
    defaultExpiry.setDate(defaultExpiry.getDate() + 30)

    const response = await request(app).post(endpoint).send(validPayload)

    expect(response.statusCode).toBe(200)

    const shortCode = response.body.data.split('/').pop()
    const storedURL = await shortURL.findOne({ shortCode })

    expect(new Date(storedURL.expiresAt).toDateString()).toBe(defaultExpiry.toDateString())
  })

  test('Should throw error when invalid URL send', async () => {
    const response = await request(app).post(endpoint).send({ orgURL: 'ldo0klsldfka;f' })

    expect(response.statusCode).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBeDefined()
  })

  test('Should return 500 when database connection failed', async () => {
    await mongoose.disconnect()

    const response = await request(app).post(endpoint).send({ orgURL: 'https://www.google.com' })

    expect(response.statusCode).toBe(500)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toMatch(/Client must be connected before running operations/i)
  })
})

describe('GET /:shortCode Redirection', () => {
  test('Should redirect, save analytics AND populate Redis cache', async () => {
    await redis.flushall()
    const shortCode = 'REDISCHECK123'
    const urlDoc = await shortURL.create({
      orgURL: 'https://youtube.com',
      shortCode: shortCode,
      expiresAt: new Date(Date.now() + 3600000),
    })

    const res = await request(app)
      .get(`/${shortCode}`)
      .set('User-Agent', 'Mozilla/5.0...')
      .set('X-Forwarded-For', '1.1.1.1')

    expect(res.status).toBe(307)
    expect(res.header.location).toBe('https://youtube.com')

    const cachedData = await redis.get(`url:${shortCode}`)
    expect(cachedData).not.toBeNull()

    const parsedCache = JSON.parse(cachedData)
    expect(parsedCache.url).toBe('https://youtube.com')
    expect(parsedCache._id).toBe(urlDoc._id.toString())

    await new Promise((resolve) => setTimeout(resolve, 500))
    const savedAnalytics = await Analytics.findOne({ shortUrlId: urlDoc._id })
    expect(savedAnalytics).not.toBeNull()
  })

  test('Should redirect using CACHE on second hit and NOT call Database', async () => {
    const shortCode = 'CACHEHIT123'
    const urlDoc = await shortURL.create({
      orgURL: 'https://netflix.com',
      shortCode,
      expiresAt: new Date(Date.now() + 3600000),
    })

    await request(app).get(`/${shortCode}`)

    const dbSpy = jest.spyOn(shortURL, 'findOne')

    const res = await request(app).get(`/${shortCode}`)

    expect(res.status).toBe(307)
    expect(res.header.location).toBe('https://netflix.com')

    expect(dbSpy).not.toHaveBeenCalled()
    dbSpy.mockRestore()
  })

  test('Redis TTL should be exactly remaining time if expiry is < 1 hour', async () => {
    const shortCode = 'TTLTEST99'
    const tenMinutes = 10 * 60 * 1000
    const customExpiry = new Date(Date.now() + tenMinutes)

    await shortURL.create({
      orgURL: 'https://quick-expire.com',
      shortCode,
      expiresAt: customExpiry,
    })

    await request(app).get(`/${shortCode}`)

    const ttl = await redis.ttl(`url:${shortCode}`)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(600)
  })

  test('Should redirect even if captureAnalytics background task fails', async () => {
    const shortCode = 'RELIABLE123'
    await shortURL.create({
      orgURL: 'https://reliable.com',
      shortCode,
      expiresAt: new Date(Date.now() + 3600000),
    })

    jest.spyOn(Analytics, 'create').mockRejectedValue(new Error('Analytics DB Down'))

    const res = await request(app).get(`/${shortCode}`)

    expect(res.status).toBe(307)
    expect(res.header.location).toBe('https://reliable.com')
  })

  test('Should return 404 if the URL exists but has EXPIRED', async () => {
    const shortCode = 'EXPIRED999'
    await shortURL.create({
      orgURL: 'https://old-site.com',
      shortCode,
      expiresAt: new Date(Date.now() - 5000),
    })

    const res = await request(app).get(`/${shortCode}`)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/expired/i)

    const cache = await redis.get(`url:${shortCode}`)
    expect(cache).toBeNull()
  })

  test('Should handle malformed or weird shortCodes without crashing', async () => {
    const weirdCodes = ['invalid-code-123', '!@#$%^', '   ']

    for (const code of weirdCodes) {
      const res = await request(app).get(`/${code}`)
      expect([400, 404, 406]).toContain(res.status)
    }
  })

  test('Should fallback to Database if Redis is DOWN/FAILING', async () => {
    const shortCode = 'RESILIENT123'
    const testURL = await shortURL.create({
      orgURL: 'https://fallback-works.com',
      shortCode,
      expiresAt: new Date(Date.now() + 3600000),
    })

    const redisSpy = jest.spyOn(redis, 'get').mockRejectedValue(new Error('Redis Connection Lost'))

    const res = await request(app).get(`/${shortCode}`)

    expect(res.status).toBe(307)
    expect(res.header.location).toBe('https://fallback-works.com')

    redisSpy.mockRestore()
  })

  test('Should return 404 if the URL is INACTIVE even if not expired', async () => {
    const shortCode = 'INACTIVE99'
    await shortURL.create({
      orgURL: 'https://hidden.com',
      shortCode,
      isActive: false,
      expiresAt: new Date(Date.now() + 3600000),
    })

    const res = await request(app).get(`/${shortCode}`)

    expect(res.status).toBe(404)

    const cache = await redis.get(`url:${shortCode}`)
    expect(cache).toBeNull()
  })

  test('Should correctly extract and save User IP and Device details during redirection', async () => {
    const shortCode = 'IPCHECK1'
    const url = await shortURL.create({
      orgURL: 'https://verify-ip.com',
      shortCode,
      expiresAt: new Date(Date.now() + 3600000),
    })

    const mockUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'

    await request(app)
      .get(`/${shortCode}`)
      .set('User-Agent', mockUA)
      .set('X-Forwarded-For', '123.123.123.123')

    await new Promise((r) => setTimeout(r, 1000))

    const saved = await Analytics.findOne({ shortUrlId: url._id })

    expect(saved).not.toBeNull()
    expect(saved.ip).toBe('123.123.123.123')

    expect(saved.device).toBeDefined()
    expect(saved.browser).not.toBe('Unknown')
    expect(saved.os).not.toBe('Unknown')
  })
})

describe('Testing captureAnalytics Background Service', () => {
  test('Should increment click count and create analytics record', async () => {
    const urlDoc = await shortURL.create({
      orgURL: 'https://sonu.com',
      shortCode: 'SONU1',
      click: 0,
    })

    const mockData = {
      ip: '1.1.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      referrer: 'https://twitter.com',
    }

    await captureAnalytics(urlDoc._id, mockData)

    const updatedURL = await shortURL.findById(urlDoc._id)
    expect(updatedURL.click).toBe(1)

    const savedAnalytics = await Analytics.findOne({ shortUrlId: urlDoc._id })
    expect(savedAnalytics).not.toBeNull()
    expect(savedAnalytics.browser).toBe('Chrome')
    expect(savedAnalytics.os).toBe('Windows')
    expect(savedAnalytics.referrer).toBe('https://twitter.com')
    expect(savedAnalytics.country).toBeDefined()
  })

  test("Should handle 'Unknown' values when UA or IP is weird", async () => {
    const urlDoc = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'UNK1' })

    const weirdData = {
      ip: 'invalid-ip',
      userAgent: 'MagicBrowser/1.0',
      referrer: '',
    }

    await captureAnalytics(urlDoc._id, weirdData)

    const savedAnalytics = await Analytics.findOne({ shortUrlId: urlDoc._id })

    expect(savedAnalytics.city).toBe('Unknown')
    expect(savedAnalytics.device).toBe('Desktop')
    expect(savedAnalytics.referrer).toBe('Direct')
  })

  test('Should not crash and use defaults if ip or userAgent is missing', async () => {
    const urlDoc = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'NULL1' })

    const brokenData = {
      ip: undefined,
      userAgent: null,
      referrer: undefined,
    }

    await expect(captureAnalytics(urlDoc._id, brokenData)).resolves.not.toThrow()

    const savedAnalytics = await Analytics.findOne({ shortUrlId: urlDoc._id })
    expect(savedAnalytics.city).toBe('Unknown')
    expect(savedAnalytics.browser).toBe('Unknown')
    expect(savedAnalytics.referrer).toBe('Direct')
  })

  test('Should handle extremely long User-Agent strings gracefully', async () => {
    const urlDoc = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'LONG1' })
    const giantUA = 'Mozilla/5.0 '.repeat(100)

    const botData = {
      ip: '1.1.1.1',
      userAgent: giantUA,
      referrer: 'https://long-referrer.com/'.repeat(10),
    }

    await captureAnalytics(urlDoc._id, botData)

    const savedAnalytics = await Analytics.findOne({ shortUrlId: urlDoc._id })
    expect(savedAnalytics).not.toBeNull()
    expect(savedAnalytics.shortUrlId).toEqual(urlDoc._id)
  })

  test('Should throw error if orgUrlId is not a valid MongoDB ObjectId', async () => {
    const invalidId = 'not-an-id-123'
    const mockData = { ip: '1.1.1.1', userAgent: 'Chrome', referrer: '' }

    await expect(captureAnalytics(invalidId, mockData)).rejects.toThrow()
  })
})
