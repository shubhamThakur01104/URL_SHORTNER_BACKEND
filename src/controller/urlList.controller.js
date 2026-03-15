import { StatusCodes } from 'http-status-codes'
import shortURL from '../model/url.model.js'
import { asyncHandler } from '../util/asyncHandler.js'
import { ApiResponse } from '../util/ApiResponse.js'
import { AppError } from '../util/ApiError.js'

export const getAllURLs = asyncHandler(async (req, res) => {
  try {
    const urls = await shortURL
      .find({ isActive: true })
      .select('orgURL shortCode click createdAt lastClickedAt')
      .sort({ createdAt: -1 })

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'

    const formattedUrls = urls.map((url) => ({
      _id: url._id,
      originalUrl: url.orgURL,
      shortCode: url.shortCode,
      shortUrl: `${baseUrl}/${url.shortCode}`,
      clickCount: url.click,
      createdAt: url.createdAt,
      lastClickedAt: url.lastClickedAt || null,
    }))

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, 'URLs fetched successfully', formattedUrls))
  } catch (error) {
    throw new AppError('Failed to fetch URLs', StatusCodes.INTERNAL_SERVER_ERROR)
  }
})
