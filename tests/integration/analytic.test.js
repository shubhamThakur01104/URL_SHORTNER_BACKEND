import request from 'supertest'
import { app } from '../../src/index.js'
import mongoose from 'mongoose'
import shortURL from '../../src/model/url.model.js'
import Analytics from '../../src/model/analysis.model.js'
import { connectDB, disconnectDB, clearDB } from '../setup.js'
import redis from '../../src/db/redisClient.js'

beforeAll(async () => await connectDB())
afterAll(async () => await disconnectDB())
afterEach(async () => await clearDB())
beforeEach(async () => await redis.flushall())

describe('GET /api/v1/analysis - Global Analytics Dashboard', () => {
  test('Should return aggregated analytics for all active URLs', async () => {
    const urlDoc = await shortURL.create({
      orgURL: 'https://test.com',
      shortCode: 'DASH1',
      isActive: true,
    })

    await Analytics.create([
      {
        shortUrlId: urlDoc._id,
        city: 'Delhi',
        country: 'IN',
        browser: 'Chrome',
        device: 'Desktop',
      },
      {
        shortUrlId: urlDoc._id,
        city: 'Mumbai',
        country: 'IN',
        browser: 'Safari',
        device: 'Mobile',
      },
      {
        shortUrlId: urlDoc._id,
        city: 'Delhi',
        country: 'IN',
        browser: 'Chrome',
        device: 'Desktop',
      },
    ])

    const res = await request(app).get('/api/v1/analysis')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const data = res.body.data

    const india = data.categorizedByCountry.find((c) => c._id === 'IN')
    expect(india.total).toBe(3)

    const delhi = data.categorizedByCity.find((c) => c._id === 'Delhi')
    expect(delhi.total).toBe(2)

    expect(data.countClickOnEachLink[0].total).toBe(3)
    expect(data.countClickOnEachLink[0]._id.toString()).toBe(urlDoc._id.toString())
  })

  test('Should EXCLUDE data from inactive URLs', async () => {
    const inactiveURL = await shortURL.create({
      orgURL: 'https://dead.com',
      shortCode: 'DEAD1',
      isActive: false,
    })

    await Analytics.create({ shortUrlId: inactiveURL._id, country: 'US' })

    const res = await request(app).get('/api/v1/analysis')

    const usData = res.body.data.categorizedByCountry.find((c) => c._id === 'US')
    expect(usData).toBeUndefined()
  })

  test('Should correctly separate click counts for multiple active URLs', async () => {
    const url1 = await shortURL.create({ orgURL: 'https://a.com', shortCode: 'A1', isActive: true })
    const url2 = await shortURL.create({ orgURL: 'https://b.com', shortCode: 'B1', isActive: true })

    await Analytics.create([
      { shortUrlId: url1._id, country: 'IN' },
      { shortUrlId: url1._id, country: 'US' },
      { shortUrlId: url2._id, country: 'IN' },
    ])

    const res = await request(app).get('/api/v1/analysis')

    const linkCounts = res.body.data.countClickOnEachLink
    expect(linkCounts).toHaveLength(2)

    const firstLink = linkCounts.find((l) => l._id.toString() === url1._id.toString())
    expect(firstLink.total).toBe(2)
  })

  test('Should handle analytics with missing/null location fields', async () => {
    const urlDoc = await shortURL.create({
      orgURL: 'https://t.com',
      shortCode: 'T1',
      isActive: true,
    })

    await Analytics.create({
      shortUrlId: urlDoc._id,
      city: null,
      country: undefined,
    })

    const res = await request(app).get('/api/v1/analysis')

    expect(res.status).toBe(200)
    const nullCity = res.body.data.categorizedByCity.find((c) => c._id === null)
    expect(nullCity).toBeDefined()
  })

  test('Should return 500 when aggregation fails', async () => {
    const spy = jest.spyOn(shortURL, 'aggregate').mockRejectedValue(new Error('DB Down'))

    const res = await request(app).get('/api/v1/analysis')

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal Server Error')
    spy.mockRestore()
  })

  test('Should handle case where NO analytics exist', async () => {
    await shortURL.create({ orgURL: 'https://new.com', shortCode: 'NEW1', isActive: true })

    const res = await request(app).get('/api/v1/analysis')

    expect(res.status).toBe(200)
    expect(res.body.data.categorizedByCountry).toHaveLength(0)
  })

  test('Should return a valid empty structure even if NO URLs exist in DB', async () => {
    const res = await request(app).get('/api/v1/analysis')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  test('Should ensure all facet keys exist in response', async () => {
    await shortURL.create({ orgURL: 'https://t.com', shortCode: 'KEY1', isActive: true })
    await Analytics.create({ shortUrlId: new mongoose.Types.ObjectId(), country: 'IN' })
    const res = await request(app).get('/api/v1/analysis')

    const keys = [
      'categorizedByRegion',
      'categorizedByCountry',
      'categorizedByCity',
      'categorizedByReferrer',
      'categorizedByDevice',
      'categorizedByBrowser',
      'categorizedByOS',
      'countClickOnEachLink',
    ]

    keys.forEach((key) => {
      expect(res.body.data).toHaveProperty(key)
      expect(Array.isArray(res.body.data[key])).toBe(true)
    })
  })

  test("Should NOT include analytics that don't belong to any ACTIVE URL", async () => {
    const orphanId = new mongoose.Types.ObjectId()
    await Analytics.create({ shortUrlId: orphanId, country: 'DE' })

    const res = await request(app).get('/api/v1/analysis')

    const germanyData = res.body.data.categorizedByCountry.find((c) => c._id === 'DE')
    expect(germanyData).toBeUndefined()
  })

  test('Should return countClickOnEachLink sorted by total clicks descending', async () => {
    const u1 = await shortURL.create({ orgURL: 'https://1.com', shortCode: 'C1', isActive: true })
    const u2 = await shortURL.create({ orgURL: 'https://2.com', shortCode: 'C2', isActive: true })

    const clicks = [
      { shortUrlId: u1._id },
      { shortUrlId: u1._id },
      { shortUrlId: u2._id },
      { shortUrlId: u2._id },
      { shortUrlId: u2._id },
      { shortUrlId: u2._id },
      { shortUrlId: u2._id },
    ]
    await Analytics.create(clicks)

    const res = await request(app).get('/api/v1/analysis')

    const data = res.body.data.countClickOnEachLink
    expect(data[0]._id.toString()).toBe(u2._id.toString())
    expect(data[0].total).toBe(5)
    expect(data[1].total).toBe(2)
  })

  test('Should EXCLUDE active URLs that have ZERO analytics records', async () => {
    const zeroClickURL = await shortURL.create({
      orgURL: 'https://zeroclicks.com',
      shortCode: 'ZERO1',
      isActive: true,
    })

    const res = await request(app).get('/api/v1/analysis')

    const found = res.body.data.countClickOnEachLink.find(
      (l) => l._id.toString() === zeroClickURL._id.toString()
    )
    expect(found).toBeUndefined()
  })
})

describe('GET /api/v1/analysis/:shortCode - Particular URL Details', () => {
  test('Should fetch from DB, populate Redis Map and Hash, and return data', async () => {
    const u = await shortURL.create({ orgURL: 'https://g.com', shortCode: 'GOO1' })
    await Analytics.create([
      { shortUrlId: u._id, city: 'Pune', country: 'IN', device: 'Desktop' },
      { shortUrlId: u._id, city: 'Pune', country: 'IN', device: 'Mobile' },
    ])

    const res = await request(app).get('/api/v1/analysis/GOO1')

    expect(res.status).toBe(200)
    expect(res.body.data.categorizedByCity[0].total).toBe(2)

    const mappedId = await redis.get(`map:GOO1`)
    expect(mappedId).toBe(u._id.toString())

    const cachedStats = await redis.hgetall(`stats:${u._id}`)
    expect(Object.keys(cachedStats).length).toBeGreaterThan(0)
    expect(JSON.parse(cachedStats.categorizedByCity)[0]._id).toBe('Pune')
  })

  test('Should return data from Redis Hash directly on second hit', async () => {
    const u = await shortURL.create({ orgURL: 'https://n.com', shortCode: 'NET1' })
    const shortURLId = u._id.toString()

    const mockStats = { categorizedByCity: JSON.stringify([{ _id: 'Mumbai', total: 10 }]) }
    await redis.set(`map:NET1`, shortURLId)
    await redis.hset(`stats:${shortURLId}`, mockStats)

    const dbSpy = jest.spyOn(Analytics, 'aggregate')

    const res = await request(app).get('/api/v1/analysis/NET1')

    expect(res.status).toBe(200)
    expect(res.body.data.categorizedByCity[0].total).toBe(10)
    expect(res.body.data.categorizedByCity[0]._id).toBe('Mumbai')

    expect(dbSpy).not.toHaveBeenCalled()
    dbSpy.mockRestore()
  })

  test('Should return 404 if shortCode does not exist in DB', async () => {
    const res = await request(app).get('/api/v1/analysis/NOEXIST')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Invalid URL')
  })

  test('Should re-fetch from DB if map exists but stats hash has expired', async () => {
    const u = await shortURL.create({ orgURL: 'https://x.com', shortCode: 'EXP1' })
    await redis.set(`map:EXP1`, u._id.toString())

    const res = await request(app).get('/api/v1/analysis/EXP1')

    expect(res.status).toBe(200)
    const statsAfter = await redis.hgetall(`stats:${u._id}`)
    expect(Object.keys(statsAfter).length).toBeGreaterThan(0)
  })

  test('Should handle empty or spaces in shortCode parameter', async () => {
    const res = await request(app).get('/api/v1/analysis/%20%20') // Spaces
    expect([400, 404, 406]).toContain(res.status)
  })

  test('Should handle URL with zero analytics without crashing', async () => {
    await shortURL.create({ orgURL: 'https://noclicks.com', shortCode: 'ZERO' })

    const res = await request(app).get('/api/v1/analysis/ZERO')

    expect(res.status).toBe(200)
    expect(res.body.data.categorizedByCity).toEqual([])
  })

  test('Should return 404 if URL is deleted from DB but map key still exists in Redis', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    await redis.set(`map:STALE`, fakeId)

    const res = await request(app).get('/api/v1/analysis/STALE')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Invalid URL')
  })

  test('Should fallback to DB if Redis is down/throwing errors', async () => {
    await shortURL.create({ orgURL: 'https://fallback.com', shortCode: 'FALLBACK' })

    const redisSpy = jest.spyOn(redis, 'get').mockRejectedValue(new Error('Redis Connection Lost'))

    const res = await request(app).get('/api/v1/analysis/FALLBACK')

    expect(res.status).toBe(200)
    redisSpy.mockRestore()
  })

  test('Should return 406 for short code less than 4 chars', async () => {
    const res = await request(app).get('/api/v1/analysis/ABC')

    expect(res.status).toBe(406)
    expect(res.body.message).toBe('Invalid Short URL')
  })

  test('Should NOT return analytics of URL B when requesting URL A', async () => {
    const urlA = await shortURL.create({ orgURL: 'https://a.com', shortCode: 'AAAA' })
    const urlB = await shortURL.create({ orgURL: 'https://b.com', shortCode: 'BBBB' })

    await Analytics.create({ shortUrlId: urlB._id, city: 'Mumbai' })

    const res = await request(app).get('/api/v1/analysis/AAAA')

    expect(res.status).toBe(200)
    expect(res.body.data.categorizedByCity).toHaveLength(0)
  })

  test('Should ensure all required facet keys are present even for empty results', async () => {
    await shortURL.create({ orgURL: 'https://t.com', shortCode: 'TEST' })
    const res = await request(app).get('/api/v1/analysis/TEST')

    const requiredKeys = [
      'categorizedByRegion',
      'categorizedByCountry',
      'categorizedByCity',
      'categorizedByReferrer',
      'categorizedByDevice',
      'categorizedByBrowser',
      'categorizedByOS',
      'countClickOnEachLink',
    ]

    requiredKeys.forEach((key) => {
      expect(res.body.data).toHaveProperty(key)
      expect(Array.isArray(res.body.data[key])).toBe(true)
    })
  })
})

describe('GET /api/v1/analysis/:shortCode/trend - Time-Series Analytics', () => {
  test('Should group clicks correctly by Day and Hour (IST Timezone)', async () => {
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'TREND1' })

    const today = new Date()
    today.setHours(10, 0, 0)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await Analytics.create([
      { shortUrlId: u._id, createdAt: today },
      { shortUrlId: u._id, createdAt: today }, // Aaj ke 2 clicks
      { shortUrlId: u._id, createdAt: yesterday }, // Kal ka 1 click
    ])

    const res = await request(app).get('/api/v1/analysis/TREND1/trend')

    expect(res.status).toBe(200)

    const todayStr = today.toISOString().split('T')[0]
    const todayData = res.body.data.perDayClick.find((d) => d._id === todayStr)
    expect(todayData.totalClick).toBe(2)

    const hourData = res.body.data.perHourClick.find((h) => h._id === 10)
    expect(hourData.totalClick).toBe(2)
  })

  test('Should serve trend data from Redis Hash and avoid DB hit', async () => {
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'CHIT1' })
    const shortURLId = u._id.toString()

    const mockTrend = {
      perDayClick: JSON.stringify([{ _id: '2024-03-11', totalClick: 5 }]),
      perHourClick: JSON.stringify([{ _id: 14, totalClick: 5 }]),
    }

    await redis.set(`trend:CHIT1`, shortURLId)
    await redis.hset(`trend:${shortURLId}`, mockTrend)

    const dbSpy = jest.spyOn(Analytics, 'aggregate')

    const res = await request(app).get('/api/v1/analysis/CHIT1/trend')

    expect(res.status).toBe(200)
    expect(res.body.data.perHourClick[0]._id).toBe(14)
    expect(dbSpy).not.toHaveBeenCalled()
    dbSpy.mockRestore()
  })

  test('Should return empty arrays if URL exists but has no clicks', async () => {
    await shortURL.create({ orgURL: 'https://t.com', shortCode: 'EMPTY1' })

    const res = await request(app).get('/api/v1/analysis/EMPTY1/trend')

    expect(res.status).toBe(200)
    expect(res.body.data.perDayClick).toHaveLength(0)
    expect(res.body.data.perHourClick).toHaveLength(0)
  })

  test('Should return 404 for non-existent shortCode', async () => {
    const res = await request(app).get('/api/v1/analysis/WRONG/trend')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Short Code not Found')
  })

  test('Should not fail if Redis throws an error (Graceful Fallback)', async () => {
    await shortURL.create({ orgURL: 'https://t.com', shortCode: 'REDFail' })

    const redisSpy = jest.spyOn(redis, 'get').mockRejectedValue(new Error('Redis Down'))

    const res = await request(app).get('/api/v1/analysis/REDFail/trend')

    expect(res.status).toBe(200)
    redisSpy.mockRestore()
  })

  test('Should correctly shift UTC clicks to IST day', async () => {
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'TZ123' })

    const lateNightUTC = new Date('2026-03-20T23:30:00Z')

    await Analytics.create({ shortUrlId: u._id, createdAt: lateNightUTC })

    const res = await request(app).get('/api/v1/analysis/TZ123/trend')

    expect(res.body.data.perDayClick[0]._id).toBe('2026-03-21')
    expect(res.body.data.perHourClick[0]._id).toBe(5)
  })

  test('Should NOT include clicks from other short URLs in trend', async () => {
    const url1 = await shortURL.create({ orgURL: 'https://1.com', shortCode: 'URL1' })
    const url2 = await shortURL.create({ orgURL: 'https://2.com', shortCode: 'URL2' })

    await Analytics.create([{ shortUrlId: url1._id }, { shortUrlId: url2._id }])

    const res = await request(app).get('/api/v1/analysis/URL1/trend')

    expect(res.body.data.perDayClick[0].totalClick).toBe(1)
  })

  test('Should re-aggregate if ID map exists in Redis but stats hash is missing', async () => {
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode: 'PARTIAL' })
    await redis.set(`trend:PARTIAL`, u._id.toString())

    const res = await request(app).get('/api/v1/analysis/PARTIAL/trend')

    expect(res.status).toBe(200)
    const statsAfter = await redis.hgetall(`trend:${u._id}`)
    expect(Object.keys(statsAfter).length).toBeGreaterThan(0)
  })

  test('Should return empty arrays if URL exists but has no clicks', async () => {
    await shortURL.create({ orgURL: 'https://t.com', shortCode: 'EMPTY1' })

    const res = await request(app).get('/api/v1/analysis/EMPTY1/trend')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('perDayClick')
    expect(res.body.data).toHaveProperty('perHourClick')
    expect(res.body.data.perDayClick).toBeInstanceOf(Array)
    expect(res.body.data.perDayClick).toHaveLength(0)
  })

  test('Should return 400/404 if shortCode validation fails (Length or Special Chars)', async () => {
    const invalidCodes = ['A', 'ABC', 'CODE!', '    ']

    for (const code of invalidCodes) {
      const res = await request(app).get(`/api/v1/analysis/${code}/trend`)

      expect([400, 404, 406]).toContain(res.status)

      if (res.status === 400) {
        expect(res.body.message).toBeDefined()
      }
    }
  })

  test('Should handle SQL Injection or NoSQL Injection attempts in shortCode', async () => {
    const maliciousCode = "TREND123'; db.dropDatabase(); //"

    const res = await request(app).get(`/api/v1/analysis/${maliciousCode}/trend`)

    expect([400, 404, 406]).toContain(res.status)
  })
})

describe('GET /api/v1/analysis/:shortCode/generateReport - CSV Export', () => {
  test('Should successfully export analytics data as CSV with correct headers', async () => {
    const shortCode = 'CSV123'
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode })

    await Analytics.create([
      {
        shortUrlId: u._id,
        city: 'Pune',
        country: 'IN',
        device: 'Mobile',
        browser: 'Chrome',
        os: 'Android',
        region: 'MH',
        referrer: 'Direct',
      },
      {
        shortUrlId: u._id,
        city: 'Mumbai',
        country: 'IN',
        device: 'Desktop',
        browser: 'Firefox',
        os: 'Windows',
        region: 'MH',
        referrer: 'Direct',
      },
    ])

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`)

    expect(res.status).toBe(200)

    const csvContent = res.text

    expect(csvContent).toContain('"city"')
    expect(csvContent).toContain('"country"')
    expect(csvContent).toContain('"device"')
    expect(csvContent).toContain('"browser"')

    expect(csvContent).toContain('"Pune"')
    expect(csvContent).toContain('"Mumbai"')
    expect(csvContent).toContain('"Chrome"')
  })

  test("Should return 404 if shortCode validation fails or doesn't exist", async () => {
    const res = await request(app).get('/api/v1/analysis/WRONG/generateReport')

    expect([404, 406]).toContain(res.status)
  })

  test('Should return 404 if URL exists but has ZERO analytics data', async () => {
    const shortCode = 'EMPTY99'
    await shortURL.create({ orgURL: 'https://empty.com', shortCode })

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`)

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('No analytics data found')
  })

  test('Should handle special characters in data without breaking CSV structure', async () => {
    const shortCode = 'SPEC1'
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode })

    await Analytics.create({
      shortUrlId: u._id,
      city: 'New, York',
      referrer: 'https://google.com?query=hello,world',
    })

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`)

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/"New, York"/)
  })

  test('Should ensure privacy by NOT including internal IDs in CSV', async () => {
    const shortCode = 'PRIV1'
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode })
    await Analytics.create({ shortUrlId: u._id, city: 'Delhi' })

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`)

    expect(res.text).not.toContain(u._id.toString())
    expect(res.text).not.toContain('_id')
  })

  test('Should handle large number of analytics records (Performance Check)', async () => {
    const shortCode = 'LARGE1'
    const u = await shortURL.create({ orgURL: 'https://t.com', shortCode })

    const manyRecords = Array.from({ length: 500 }).map(() => ({
      shortUrlId: u._id,
      city: 'TestCity',
      country: 'IN',
      device: 'Mobile',
    }))
    await Analytics.insertMany(manyRecords)

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`)

    expect(res.status).toBe(200)
    const lines = res.text.trim().split('\n')
    expect(lines.length).toBe(501)
  })

  test('Should return 500 if the DB fails unexpectedly', async () => {
    const shortCode = 'FAIL1';


    const dbSpy = jest.spyOn(shortURL, 'findOne').mockImplementation(() => ({
      select: jest.fn().mockRejectedValue(new Error('DB Connection Lost')),
    }));

    const res = await request(app).get(`/api/v1/analysis/${shortCode}/generateReport`);

    expect(res.status).toBe(500);

    expect(res.body.message).toBe('Internal Server Error');

    dbSpy.mockRestore();
  });
})
