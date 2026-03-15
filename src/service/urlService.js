import { StatusCodes } from 'http-status-codes'
import { AppError } from '../util/ApiError.js'
import logger from '../util/logger.js'
import Counter from '../model/counter.model.js'
import { encodeBase62 } from '../util/hashGenerator.js'
import shortURL from '../model/url.model.js'
import { ENV } from '../util/env.js'
import { validateURL, validShortCode } from '../util/validation.js'
import geoip from 'geoip-lite'
import Analytics from '../model/analysis.model.js'
import { UAParser } from 'ua-parser-js'
import redis from '../db/redisClient.js'

export const shortURLGeneratorService = async (data) => {
  let { orgURL, expiresAt } = data

  if (!expiresAt) {
    const date = new Date()

    date.setDate(date.getDate() + 30)

    expiresAt = date
  }

  const url = validateURL(orgURL)

  try {
    const counter = await Counter.findOneAndUpdate(
      { id: 'urlCounter' },
      {
        $inc: {
          counter: 1,
        },
      },
      {
        new: true,
        upsert: true,
      }
    )

    const shortCode = encodeBase62(counter.counter)

    const savedLink = await shortURL.create({
      orgURL: url,
      shortCode: shortCode,
      expiresAt: expiresAt,
    })

    const newShortURL = ENV.BASE_URL + `${savedLink.shortCode}`

    return newShortURL
  } catch (error) {
    logger.error('Service Error:', error)
    throw new AppError(
      error.message || 'Internal Server Error',
      StatusCodes.INTERNAL_SERVER_ERROR,
      false
    )
  }
}

export const urlRedirectionService = async (shortCode, req) => {
  const validatedCode = validShortCode(shortCode)

  const analyticsData = {
    ip: req.ip === '::1' ? '47.15.230.222' : req.ip,
    userAgent: req.headers['user-agent'],
    referrer: req.headers['referer'],
  }

  try {
    let longURL = null

    try {
      longURL = await redis.get(`url:${validatedCode}`)
    } catch (redisError) {
      logger.error('Redis Get Failed, falling back to DB:', redisError)
    }

    let finalData

    if (!longURL) {
      const originalURL = await shortURL.findOne({ shortCode: validatedCode })

      if (
        !originalURL ||
        originalURL.isActive === false ||
        (originalURL.expiresAt && originalURL.expiresAt < new Date())
      ) {
        throw new AppError('URL not exist or expired', StatusCodes.NOT_FOUND)
      }

      finalData = {
        _id: originalURL._id.toString(),
        url: originalURL.orgURL,
      }

      const remainingTime = Math.round(
        (new Date(originalURL.expiresAt).getTime() - Date.now()) / 1000
      )
      const ttl = Math.min(remainingTime, 3600)

      if (ttl > 0) {
        redis
          .set(`url:${validatedCode}`, JSON.stringify(finalData), 'EX', ttl)
          .catch((err) => logger.error('Redis Set Failed:', err))
      }
    } else {
      finalData = JSON.parse(longURL)
    }

    captureAnalytics(finalData._id, analyticsData).catch((err) =>
      logger.error('Background Analytics Failed:', err)
    )

    return finalData.url
  } catch (error) {
    logger.error('Service Error:', error)

    if (error instanceof AppError) throw error

    throw new AppError('Internal Server Error', StatusCodes.INTERNAL_SERVER_ERROR, false)
  }
}

export const captureAnalytics = async (orgUrlId, analyticsData) => {
  try {
    const { ip, userAgent, referrer } = analyticsData

    const userInfo = geoip.lookup(ip) || {}

    const parser = new UAParser(userAgent)
    const deviceData = parser.getResult()

    await shortURL.findByIdAndUpdate(orgUrlId, {
      $inc: {
        click: 1,
      },
    })

    await Analytics.create({
      shortUrlId: orgUrlId,
      ip,
      city: userInfo.city || 'Unknown',
      region: userInfo.region || 'Unknown',
      country: userInfo.country || 'Unknown',
      browser: deviceData.browser.name || 'Unknown',
      os: deviceData.os.name || 'Unknown',
      referrer: referrer || 'Direct',
      device: deviceData.device.type || 'Desktop',
    })
  } catch (err) {
    logger.error('Analytics Background Save Failed:', err)
    throw new AppError(err, StatusCodes.INTERNAL_SERVER_ERROR, false)
  }
}
