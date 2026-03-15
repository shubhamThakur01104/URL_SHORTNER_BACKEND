import redis from '../../../src/db/redisClient.js'
import Analytics from '../../../src/model/analysis.model.js'
import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'
import Counter from '../../../src/model/counter.model.js'
import shortURL from '../../../src/model/url.model.js'
import {
  captureAnalytics,
  shortURLGeneratorService,
  urlRedirectionService,
} from '../../../src/service/urlService.js'

import mongoose from 'mongoose'

afterAll(async () => {
  jest.restoreAllMocks()
})

afterEach(async () => {
  jest.useRealTimers()
})

const mockReq = {
  ip: '127.9.0.1',
  headers: { 'user-agent': 'jest-test', referer: 'google.com' },
}

jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip) => {
    if (ip === '1.1.1.1') return { city: 'Delhi', region: 'UP', country: 'IN' }
    return null
  }),
}))

jest.mock('ua-parser-js', () => ({
  UAParser: jest.fn().mockImplementation(() => ({
    getResult: () => ({
      browser: { name: 'Chrome' },
      os: { name: 'Windows' },
      device: { type: 'Desktop' },
    }),
  })),
}))

describe('Testing create URL Service', () => {
  test('Should create a short URL successfully.', async () => {
    const data = {
      orgURL: 'https://test.com',
      expiresAt: '2026-05-20T12:00:00Z',
    }

    const mockCounterValue = 12343424
    const mockShortCode = 'PN5u'

    const counterSpy = jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({
      counter: mockCounterValue,
    })

    const saveLinkSpy = jest.spyOn(shortURL, 'create').mockResolvedValue({
      ...data,
      shortCode: mockShortCode,
    })

    const result = await shortURLGeneratorService(data)

    expect(typeof result).toBe('string')
    expect(result).toContain('http://localhost:5000')
    expect(result).toContain(mockShortCode)

    expect(counterSpy).toHaveBeenCalledWith(
      { id: 'urlCounter' },
      { $inc: { counter: 1 } },
      expect.any(Object)
    )
    expect(saveLinkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orgURL: data.orgURL,
        shortCode: mockShortCode,
        expiresAt: data.expiresAt,
      })
    )
  })

  test('Should set default expiry if expiry date not provided.', async () => {
    const orgURL = 'https://www.google.com'
    const mockNow = new Date('2026-03-07T10:00:00Z')

    jest.useFakeTimers().setSystemTime(mockNow)

    const expectedExpiry = new Date(mockNow)
    expectedExpiry.setDate(expectedExpiry.getDate() + 30)

    const counterValue = 1030535323
    const expectedShortCode = '17K1jt'

    const counterSpy = jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({
      counter: counterValue,
    })

    const savedLinkSpy = jest.spyOn(shortURL, 'create').mockResolvedValue({
      orgURL: orgURL,
      shortCode: expectedShortCode,
      expiresAt: expectedExpiry,
    })

    const resultURL = await shortURLGeneratorService({ orgURL })

    const saveCallArgs = savedLinkSpy.mock.calls[0][0]
    expect(saveCallArgs.expiresAt.toDateString()).toBe(expectedExpiry.toDateString())

    expect(counterSpy).toHaveBeenCalledWith(
      { id: 'urlCounter' },
      { $inc: { counter: 1 } },
      expect.any(Object)
    )

    expect(savedLinkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orgURL: orgURL,
        shortCode: expectedShortCode,
        expiresAt: expectedExpiry,
      })
    )

    expect(typeof resultURL).toBe('string')

    jest.useRealTimers()
  })

  test('Should throw error on Incorrect orgURL', async () => {
    const data = {
      orgURL: 'this-is-not-a-url',
    }

    const counterSpy = jest.spyOn(Counter, 'findOneAndUpdate')
    const saveLinkSpy = jest.spyOn(shortURL, 'create')

    await expect(shortURLGeneratorService(data)).rejects.toThrow('Invalid URL')

    expect(counterSpy).not.toHaveBeenCalled()
    expect(saveLinkSpy).not.toHaveBeenCalled()
  })

  test('Concurrency: Should handle multiple simultaneous requests without duplicate codes', async () => {
    const counterSpy = jest
      .spyOn(Counter, 'findOneAndUpdate')
      .mockResolvedValueOnce({ counter: 100 })
      .mockResolvedValueOnce({ counter: 101 })
      .mockResolvedValueOnce({ counter: 102 })

    jest.spyOn(shortURL, 'create').mockImplementation((data) => Promise.resolve(data))

    const requests = [
      shortURLGeneratorService({ orgURL: 'https://site1.com' }),
      shortURLGeneratorService({ orgURL: 'https://site2.com' }),
      shortURLGeneratorService({ orgURL: 'https://site3.com' }),
    ]

    const results = await Promise.all(requests)

    const uniqueCodes = new Set(results)

    expect(uniqueCodes.size).toBe(3)
    expect(counterSpy).toHaveBeenCalledTimes(3)
  })
})

describe('Testing URL redirection Service: Redis and DB integration', () => {
  const shortCodeToSearch = [['1'], ['@42042'], [null], [undefined], [34], [42]]

  test('Should return URL from Redis and skip DB call', async () => {
    const shortCode = 'test123'
    const cachedData = JSON.stringify({
      _id: '65f1a2b3c4d5e6f7a8b9c0d1',
      url: 'https://cached-url.com',
    })

    jest.spyOn(redis, 'get').mockResolvedValue(cachedData)

    const dbSpy = jest.spyOn(shortURL, 'findOne')

    const result = await urlRedirectionService(shortCode, mockReq)

    expect(result).toBe('https://cached-url.com')
    expect(dbSpy).not.toHaveBeenCalled()
  })

  test('Should return URL from DB and UPDATE REDIS with dynamic TTL', async () => {
    const mockId = new mongoose.Types.ObjectId()
    const futureDate = new Date(Date.now() + 3600000)

    const data = {
      _id: mockId,
      orgURL: 'https://google.com',
      shortCode: '124bcd',
      expiresAt: futureDate,
    }

    jest.spyOn(redis, 'get').mockResolvedValue(null)
    const redisSetSpy = jest.spyOn(redis, 'set').mockResolvedValue('OK')
    const dbSpy = jest.spyOn(shortURL, 'findOne').mockResolvedValue(data)

    const resultURL = await urlRedirectionService(data.shortCode, mockReq)

    expect(resultURL).toBe(data.orgURL)
    expect(dbSpy).toHaveBeenCalled()

    expect(redisSetSpy).toHaveBeenCalledWith(
      `url:${data.shortCode}`,
      expect.any(String),
      'EX',
      expect.any(Number)
    )
  })

  test.each(shortCodeToSearch)(
    'Should block execution for invalid shortCode: %p',
    async (shortCode) => {
      const dbSpy = jest.spyOn(shortURL, 'findOne')
      const redisSpy = jest.spyOn(redis, 'get')

      await expect(urlRedirectionService(shortCode, mockReq)).rejects.toThrow()

      expect(dbSpy).not.toHaveBeenCalled()
      expect(redisSpy).not.toHaveBeenCalled()
    }
  )

  test('Check what to get when our database or redis server is down', async () => {
    const shortCode = '124bcd'
    const redisErrorMessage = 'Internal Server Error'

    const redisSpy = jest.spyOn(redis, 'get').mockRejectedValue(new Error(redisErrorMessage))
    const dbSpy = jest
      .spyOn(shortURL, 'findOne')
      .mockRejectedValue(new Error('Database connection failed'))

    await expect(urlRedirectionService(shortCode, mockReq)).rejects.toThrow(redisErrorMessage)

    expect(redisSpy).toHaveBeenCalled()
  })
})

describe('Testing Analytic Service registering details of the user', () => {
  test('Create analytic report successfully', async () => {
    const mockId = new mongoose.Types.ObjectId()
    const mockData = {
      ip: '1.1.1.1',
      userAgent: 'Mozilla/5.0',
      referer: 'https://google.com',
    }

    const findDBSpy = jest.spyOn(shortURL, 'findByIdAndUpdate').mockResolvedValue({})
    const createDBSpy = jest.spyOn(Analytics, 'create').mockResolvedValue({})

    await captureAnalytics(mockId, mockData)

    expect(findDBSpy).toHaveBeenCalledWith(mockId, expect.objectContaining({ $inc: { click: 1 } }))

    expect(createDBSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Delhi',
        browser: 'Chrome',
      })
    )
  })

  test("Should use 'Unknown' defaults when geoip returns null", async () => {
    geoip.lookup.mockReturnValueOnce(null)

    const mockGetResult = jest.fn().mockReturnValue({
      browser: {},
      os: {},
      device: {},
    })

    UAParser.mockImplementationOnce(() => ({
      getResult: mockGetResult,
    }))

    const analyticsSpy = jest.spyOn(Analytics, 'create').mockResolvedValue({})
    jest.spyOn(shortURL, 'findByIdAndUpdate').mockResolvedValue({})

    await captureAnalytics(new mongoose.Types.ObjectId(), { ip: '0.0.0.0' })

    expect(analyticsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Unknown',
        country: 'Unknown',
        browser: 'Unknown',
        os: 'Unknown',
        device: 'Desktop',
      })
    )
  })

  test('Should throw AppError when Database creation fails', async () => {
    const mockId = new mongoose.Types.ObjectId()
    const dbErrorMessage = 'MongoDB Connection Lost'

    jest.spyOn(Analytics, 'create').mockRejectedValueOnce(new Error(dbErrorMessage))
    jest.spyOn(shortURL, 'findByIdAndUpdate').mockResolvedValue({})

    await expect(captureAnalytics(mockId, { ip: '1.1.1.1' })).rejects.toThrow(dbErrorMessage)
  })
})
