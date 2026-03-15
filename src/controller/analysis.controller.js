import { StatusCodes } from 'http-status-codes'
import {
  exportAnalyticsCSV,
  getAllDetailsService,
  getParticualShortCodeDetailService,
  getURLAnalyticsTrendService,
} from '../service/analyticService.js'
import { asyncHandler } from '../util/asyncHandler.js'
import { ApiResponse } from '../util/ApiResponse.js'

export const getAllDetails = asyncHandler(async (_, res) => {
  const result = await getAllDetailsService()

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Everything is working', result))
})

export const getParticualShortCodeDetail = asyncHandler(async (req, res) => {
  const { shortCode } = req.params

  const result = await getParticualShortCodeDetailService(shortCode)

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Everything is working', result))
})

export const getURLAnalyticsTrend = asyncHandler(async (req, res) => {
  const { shortCode } = req.params

  const result = await getURLAnalyticsTrendService(shortCode)

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Everything is working', result))
})

export const getReport = asyncHandler(async (req, res) => {
  const { shortCode } = req.params
  const result = await exportAnalyticsCSV(shortCode)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=report-${shortCode}.csv`)

  return res.status(StatusCodes.OK).send(result)
})
