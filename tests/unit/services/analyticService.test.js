import mongoose from 'mongoose'
import shortURL from '../../../src/model/url.model.js'
import {
  exportAnalyticsCSV,
  getAllDetailsService,
  getParticualShortCodeDetailService,
  getURLAnalyticsTrendService,
} from '../../../src/service/analyticService.js'
import { clearDB, connectDB, disconnectDB, startRedis, stopRedis } from '../../setup.js'
import Analytics from '../../../src/model/analysis.model.js'
import { validShortCode } from '../../../src/util/validation.js'
import redis from '../../../src/db/redisClient.js'

let client

beforeAll(async () => {
  await connectDB()
  client = await startRedis()
})

afterAll(async () => {
  await disconnectDB()
  await stopRedis()
  jest.restoreAllMocks()
})

afterEach(async () => {
  if (client && client.status === 'ready') {
    await client.flushall()
  }
  await clearDB()
})

describe('Testing all URL detail generator Service', () => {
  test('Testing getting all URL details - Success Path', async () => {
    const mockResult = [
      {
        categorizedByRegion: [{ _id: 'Delhi', total: 5 }],
        categorizedByCountry: [{ _id: 'IN', total: 10 }],
        countClickOnEachLink: [{ _id: 'abc', total: 100 }],
      },
    ]

    const aggregateSpy = jest.spyOn(shortURL, 'aggregate').mockResolvedValue(mockResult)

    const result = await getAllDetailsService()

    expect(aggregateSpy).toHaveBeenCalled()
    expect(result).toEqual(mockResult[0])

    const pipeline = aggregateSpy.mock.calls[0][0]
    expect(pipeline).toContainEqual({ $match: { isActive: true } })
  })

  test('Should throw Internal Server Error when aggregation fails', async () => {
    const aggregateSpy = jest
      .spyOn(shortURL, 'aggregate')
      .mockRejectedValue(new Error('DB Connection Lost'))

    await expect(getAllDetailsService()).rejects.toThrow('Internal Server Error')

    expect(aggregateSpy).toHaveBeenCalled()
  })

  test('Should return empty structure if no data found', async () => {
    jest.spyOn(shortURL, 'aggregate').mockResolvedValue([])

    const result = await getAllDetailsService()

    expect(result).toBeUndefined()
  })
})

describe('Testing a particular short code detail service', () => {
  test('Testing is URL analytical data cached ', async () => {
    const shortCode = '123abc'
    const shortCodeId = new mongoose.Types.ObjectId().toString()
    const mockCachedData = {
      categorizedByRegion: JSON.stringify([{ _id: 'Delhi', total: 5 }]),
      categorizedByCountry: JSON.stringify([{ _id: 'IN', total: 10 }]),
      countClickOnEachLink: JSON.stringify([{ _id: 'abc', total: 100 }]),
    }

    const redisGetSpy = jest.spyOn(redis, 'get').mockResolvedValue(shortCodeId)
    const redisHGetAllSpy = jest.spyOn(redis, 'hgetall').mockResolvedValue(mockCachedData)
    const findOneSpy = jest.spyOn(shortURL, 'findOne')
    const aggregateSpy = jest.spyOn(Analytics, 'aggregate')

    const result = await getParticualShortCodeDetailService(shortCode)

    expect(redisGetSpy).toHaveBeenCalledWith(`map:${shortCode}`)
    expect(redisHGetAllSpy).toHaveBeenCalledWith(`stats:${shortCodeId}`)
    expect(findOneSpy).not.toHaveBeenCalled()
    expect(aggregateSpy).not.toHaveBeenCalled()
    expect(result.categorizedByRegion[0]._id).toBe('Delhi')
    expect(Array.isArray(result.categorizedByCountry)).toBe(true)
  })

  test('Testing to fetch data from database when cache miss', async () => {
    const shortCode = '123abc'
    const shortCodeId = new mongoose.Types.ObjectId()
    const redisGetSpy = jest.spyOn(redis, 'get').mockResolvedValue(null)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: shortCodeId }),
    })

    const aggregateSpy = jest.spyOn(Analytics, 'aggregate').mockResolvedValue([
      {
        categorizedByRegion: [],
      },
    ])

    const redisSetSpy = jest.spyOn(redis, 'set').mockResolvedValue('OK')
    const redisHsetSpy = jest.spyOn(redis, 'hset').mockResolvedValue(1)
    const redisExpireSpy = jest.spyOn(redis, 'expire').mockResolvedValue(1)

    const data = await getParticualShortCodeDetailService(shortCode)

    expect(redisGetSpy).toHaveBeenCalledWith(`map:${shortCode}`)
    expect(findOneSpy).toHaveBeenCalled()
    expect(aggregateSpy).toHaveBeenCalled()
    expect(redisSetSpy).toHaveBeenCalled()
    expect(redisHsetSpy).toHaveBeenCalled()
    expect(redisExpireSpy).toHaveBeenCalled()
    expect(data).toBeDefined()
  })

  test('Should throw AppError 404 if shortCode is not found in Redis and Database', async () => {
    const shortCode = '1223kd'
    const redisSpy = jest.spyOn(redis, 'get').mockResolvedValue(null)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    })

    const aggregateSpy = jest.spyOn(Analytics, 'aggregate')

    await expect(getParticualShortCodeDetailService(shortCode)).rejects.toThrow('Invalid URL')

    expect(redisSpy).toHaveBeenCalledWith(`map:${shortCode}`)
    expect(findOneSpy).toHaveBeenCalled()
    expect(aggregateSpy).not.toHaveBeenCalled()
  })

  test('Should throw Validation Error if shortCode is too short', async () => {
    const invalidShortCode = 'abc'

    await expect(getParticualShortCodeDetailService(invalidShortCode)).rejects.toThrow(
      'Invalid Short URL'
    )
  })

  test('Should handle DB crash in Unit Test', async () => {
    const shortCode = '123abc'
    jest.spyOn(redis, 'get').mockResolvedValue(null)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Database Connection Failed')),
    })

    await expect(getParticualShortCodeDetailService(shortCode)).rejects.toThrow(
      'Internal Server Error'
    )

    expect(findOneSpy).toHaveBeenCalled()
  })
})

describe('Testing a particualr short code trend service', () => {
  test("Testing is analytical trend data cached and don't do DB calls", async () => {
    const shortCode = '123abc'
    const shortCodeId = new mongoose.Types.ObjectId().toString()
    const mockedData = {
      perHourClick: JSON.stringify([
        { _id: 16, totalClick: 2 },
        { _id: 20, totalClick: 8 },
      ]),
    }

    const validatedCode = validShortCode(shortCode)
    const redisHit = jest.spyOn(redis, 'get').mockResolvedValue(shortCodeId)
    const getCachedData = jest.spyOn(redis, 'hgetall').mockResolvedValue(mockedData)
    const findOneSpy = jest.spyOn(shortURL, 'findOne')
    const aggregateSpy = jest.spyOn(Analytics, 'aggregate')

    const data = await getURLAnalyticsTrendService(shortCode)

    expect(redisHit).toHaveBeenCalledWith(`trend:${validatedCode}`)
    expect(getCachedData).toHaveBeenCalledWith(`trend:${shortCodeId}`)
    expect(findOneSpy).not.toHaveBeenCalled()
    expect(aggregateSpy).not.toHaveBeenCalled()

    expect(data.perHourClick).toHaveLength(2)
    expect(data.perHourClick[0].totalClick).toBe(2)
  })

  test('Should fetch and cache trend data when not in cache (Cache Miss Scenario)', async () => {
    const shortCode = '123abc'
    const mockId = new mongoose.Types.ObjectId()
    const shortURLIdString = mockId.toString()

    const getSpy = jest.spyOn(redis, 'get').mockResolvedValue(null)
    const setSpy = jest.spyOn(redis, 'set').mockResolvedValue('OK')
    const hsetSpy = jest.spyOn(redis, 'hset').mockResolvedValue(1)
    const expireSpy = jest.spyOn(redis, 'expire').mockResolvedValue(1)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockId }),
    })

    const mockTrendData = {
      perHourClick: [{ _id: 10, totalClick: 5 }],
      perDayClick: [{ _id: '2024-05-20', totalClick: 20 }],
    }
    const aggregateSpy = jest.spyOn(Analytics, 'aggregate').mockResolvedValue([mockTrendData])

    const result = await getURLAnalyticsTrendService(shortCode)

    expect(getSpy).toHaveBeenCalledWith(`trend:${shortCode}`)
    expect(findOneSpy).toHaveBeenCalledWith({ shortCode })
    expect(setSpy).toHaveBeenCalledWith(`trend:${shortCode}`, shortURLIdString, 'EX', 3600)
    expect(hsetSpy).toHaveBeenCalledWith(`trend:${shortURLIdString}`, expect.any(Object))
    expect(expireSpy).toHaveBeenCalledWith(`trend:${shortURLIdString}`, 300)
    expect(result).toEqual(mockTrendData)
  })

  test('Should throw AppError 404 if shortCode info is not found in Redis and Database', async () => {
    const shortCode = '123abc'
    const getSpy = jest.spyOn(redis, 'get').mockResolvedValue(null)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    })

    const aggregateSpy = jest.spyOn(Analytics, 'aggregate')

    await expect(getURLAnalyticsTrendService(shortCode)).rejects.toThrow('Short Code not Found')
    expect(findOneSpy).toHaveBeenCalled()
    expect(getSpy).toHaveBeenCalledWith(`trend:${shortCode}`)
    expect(aggregateSpy).not.toHaveBeenCalled()
  })

  test('Should throw Validation Error if shortCode is too short', async () => {
    const invalidShortCode = 'abc'

    await expect(getURLAnalyticsTrendService(invalidShortCode)).rejects.toThrow('Invalid Short URL')
  })

  test('Should handle DB crash in Unit Test', async () => {
    const validCode = 'abcd'
    jest.spyOn(redis, 'get').mockResolvedValue(null)

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Database Connection Failed')),
    })

    await expect(getURLAnalyticsTrendService(validCode)).rejects.toThrow('Internal Server Error')

    expect(findOneSpy).toHaveBeenCalled()
  })
})

describe('Testing Export Analytics report in CSV Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Should convert analytics data to CSV string successfully', async () => {
    const shortCode = '123abc'
    const mockId = new mongoose.Types.ObjectId()
    const mockDetails = [
      { ip: '1.1.1.1', city: 'Delhi', country: 'India' },
      { ip: '2.2.2.2', city: 'Mumbai', country: 'India' },
    ]

    jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockId }),
    })

    jest.spyOn(Analytics, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockDetails),
    })

    const result = await exportAnalyticsCSV(shortCode)

    expect(typeof result).toBe('string')
    expect(result).toContain('"ip","city","country"')
    expect(result).toContain('"1.1.1.1","Delhi","India"')
  })

  test('Throw Error when no data available regardin that shortCode', async () => {
    const shortCode = '123abc'
    const shortCodeId = new mongoose.Types.ObjectId()

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: shortCodeId }),
    })

    const findSpy = jest.spyOn(Analytics, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    })

    await expect(exportAnalyticsCSV(shortCode)).rejects.toThrow('No analytics data found')

    expect(findOneSpy).toHaveBeenCalled()
    expect(findSpy).toHaveBeenCalled()
  })

  test('Throw Error when no shortCode available', async () => {
    const shortCode = '123abc'

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    })

    const findSpy = jest.spyOn(Analytics, 'find')

    await expect(exportAnalyticsCSV(shortCode)).rejects.toThrow('No URL Found')

    expect(findOneSpy).toHaveBeenCalled()
    expect(findSpy).not.toHaveBeenCalled()
  })

  test('Should throw Validation Error if shortCode is invalid', async () => {
    const invalidShortCode = 'abc'

    await expect(exportAnalyticsCSV(invalidShortCode)).rejects.toThrow('Invalid Short URL')
  })

  test('Throw Error when database crash', async () => {
    const shortCode = '123abc'

    const findOneSpy = jest.spyOn(shortURL, 'findOne').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Database connection failed')),
    })

    const findSpy = jest.spyOn(Analytics, 'find')

    await expect(exportAnalyticsCSV(shortCode)).rejects.toThrow('Internal Server Error')

    expect(findOneSpy).toHaveBeenCalled()
    expect(findSpy).not.toHaveBeenCalled()
  })
})
