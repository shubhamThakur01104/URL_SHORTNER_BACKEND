import { StatusCodes } from 'http-status-codes'
import { AppError } from '../util/ApiError.js'
import shortURL from '../model/url.model.js'
import { Parser } from '@json2csv/plainjs'
import Analytics from '../model/analysis.model.js'
import redis from '../db/redisClient.js'
import logger from '../util/logger.js'
import { validShortCode } from '../util/validation.js'

export const getAllDetailsService = async () => {
  try {
    const result = await shortURL.aggregate([
      {
        $match: {
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'analytics',
          localField: '_id',
          foreignField: 'shortUrlId',
          as: 'analyticsData',
        },
      },
      {
        $unwind: {
          path: '$analyticsData',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          categorizedByRegion: [{ $group: { _id: '$analyticsData.region', total: { $sum: 1 } } }],
          categorizedByCountry: [{ $group: { _id: '$analyticsData.country', total: { $sum: 1 } } }],
          categorizedByCity: [{ $group: { _id: '$analyticsData.city', total: { $sum: 1 } } }],
          categorizedByReferrer: [
            { $group: { _id: '$analyticsData.referrer', total: { $sum: 1 } } },
          ],
          categorizedByDevice: [{ $group: { _id: '$analyticsData.device', total: { $sum: 1 } } }],
          categorizedByBrowser: [{ $group: { _id: '$analyticsData.browser', total: { $sum: 1 } } }],
          categorizedByOS: [{ $group: { _id: '$analyticsData.os', total: { $sum: 1 } } }],
          countClickOnEachLink: [
            { $group: { _id: '$analyticsData.shortUrlId', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
          ],
        },
      },
    ])

    return result[0]
  } catch (error) {
    throw new AppError('Internal Server Error', StatusCodes.INTERNAL_SERVER_ERROR)
  }
}

export const getParticualShortCodeDetailService = async (shortCode) => {
  try {
    const validateShortCode = validShortCode(shortCode)
    let cachedURLId = null

    try {
      cachedURLId = await redis.get(`map:${validateShortCode}`)
    } catch (redisError) {
      logger.error('Redis Map Get Failed:', redisError)
    }

    if (cachedURLId) {
      try {
        const cachedData = await redis.hgetall(`stats:${cachedURLId}`)
        if (Object.keys(cachedData).length > 0) {
          return Object.fromEntries(
            Object.entries(cachedData).map(([key, value]) => [key, JSON.parse(value)])
          )
        }
      } catch (hashError) {
        logger.error('Redis Stats HGetall Failed:', hashError)
      }
    }

    const shorturlDetail = await shortURL
      .findOne({
        shortCode: validateShortCode,
      })
      .select('_id')

    if (!shorturlDetail) {
      throw new AppError('Invalid URL', StatusCodes.NOT_FOUND)
    }

    const shortURLId = shorturlDetail._id.toString()

    redis.set(`map:${validateShortCode}`, shortURLId, 'EX', 3600).catch((err) => logger.error(err))

    const shortCodeDetail = await Analytics.aggregate([
      {
        $match: {
          shortUrlId: shorturlDetail._id,
        },
      },
      {
        $facet: {
          categorizedByRegion: [{ $group: { _id: '$region', total: { $sum: 1 } } }],
          categorizedByCountry: [{ $group: { _id: '$country', total: { $sum: 1 } } }],
          categorizedByCity: [{ $group: { _id: '$city', total: { $sum: 1 } } }],
          categorizedByReferrer: [{ $group: { _id: '$referrer', total: { $sum: 1 } } }],
          categorizedByDevice: [{ $group: { _id: '$device', total: { $sum: 1 } } }],
          categorizedByBrowser: [{ $group: { _id: '$browser', total: { $sum: 1 } } }],
          categorizedByOS: [{ $group: { _id: '$os', total: { $sum: 1 } } }],
          countClickOnEachLink: [
            { $group: { _id: '$shortUrlId', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
          ],
        },
      },
    ])

    const sortedResult = shortCodeDetail[0]

    try {
      const analyticInfo = Object.fromEntries(
        Object.entries(sortedResult).map(([key, value]) => [key, JSON.stringify(value)])
      )
      const statsKey = `stats:${shortURLId}`
      await redis.hset(statsKey, analyticInfo)
      await redis.expire(statsKey, 300)
    } catch (cacheSetError) {
      logger.error('Failed to populate stats cache:', cacheSetError)
    }

    return sortedResult
  } catch (error) {
    logger.error('Service Error:', error)

    if (error instanceof AppError) {
      throw error
    }
    throw new AppError('Internal Server Error', StatusCodes.INTERNAL_SERVER_ERROR, false)
  }
}

export const getURLAnalyticsTrendService = async (shortCode) => {
  try {
    const validateShortCode = validShortCode(shortCode)
    let cachedURLId = null

    try {
      cachedURLId = await redis.get(`trend:${validateShortCode}`)
    } catch (err) {
      logger.error('Redis Trend Map Get Failed, falling back to DB:', err)
    }

    if (cachedURLId) {
      try {
        const statsKey = `trend:${cachedURLId}`
        const cachedData = await redis.hgetall(statsKey)

        if (Object.keys(cachedData).length > 0) {
          return Object.fromEntries(
            Object.entries(cachedData).map(([key, value]) => [key, JSON.parse(value)])
          )
        }
      } catch (err) {
        logger.error('Redis Trend Hash Get Failed:', err)
      }
    }

    const shortURLInfo = await shortURL.findOne({ shortCode: validateShortCode }).select('_id')

    if (!shortURLInfo) {
      throw new AppError('Short Code not Found', StatusCodes.NOT_FOUND)
    }

    const shortURLId = shortURLInfo._id.toString()

    redis
      .set(`trend:${shortCode}`, shortURLId, 'EX', 3600)
      .catch((err) => logger.error('Redis Trend Set Failed:', err))

    const getTrendInfo = await Analytics.aggregate([
      {
        $match: {
          shortUrlId: shortURLInfo._id,
        },
      },
      {
        $facet: {
          perHourClick: [
            {
              $group: {
                _id: { $hour: { date: '$createdAt', timezone: '+05:30' } },
                totalClick: { $sum: 1 },
              },
            },
          ],
          perDayClick: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' },
                },
                totalClick: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])

    const sortedResult = getTrendInfo[0]

    try {
      const analyticInfo = Object.fromEntries(
        Object.entries(sortedResult).map(([key, value]) => [key, JSON.stringify(value)])
      )
      const mappedKey = `trend:${shortURLId}`
      await redis.hset(mappedKey, analyticInfo)
      await redis.expire(mappedKey, 300)
    } catch (err) {
      logger.error('Redis Trend HSet Failed:', err)
    }

    return sortedResult
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    logger.error('Trend Service Error:', error)
    throw new AppError('Internal Server Error', StatusCodes.INTERNAL_SERVER_ERROR, false)
  }
}

export const exportAnalyticsCSV = async (shortCode) => {
  try {
    const validatedShortCode = validShortCode(shortCode)

    const shortCodeInfo = await shortURL.findOne({ shortCode: validatedShortCode }).select('_id')

    if (!shortCodeInfo) {
      throw new AppError('No URL Found', StatusCodes.NOT_FOUND)
    }

    const shortCodeDetails = await Analytics.find({ shortUrlId: shortCodeInfo })
      .select('ip city country region device browser os referrer clickDate -_id')
      .lean()

    if (!shortCodeDetails || shortCodeDetails.length === 0) {
      throw new AppError('No analytics data found', StatusCodes.NOT_FOUND)

    }

    const parser = new Parser()
    const csv = parser.parse(shortCodeDetails)

    return csv
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Internal Server Error', StatusCodes.INTERNAL_SERVER_ERROR, false)
  }
}
