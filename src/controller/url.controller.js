import { StatusCodes } from 'http-status-codes'
import { shortURLGeneratorService, urlRedirectionService } from '../service/urlService.js'
import { asyncHandler } from '../util/asyncHandler.js'
import { ApiResponse } from '../util/ApiResponse.js'

export const shortURLGenerator = asyncHandler(async (req, res) => {
  const data = req.body

  const shortURL = await shortURLGeneratorService(data)

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, 'Short URL Generated Successfully.', shortURL))
})

export const urlRedirection = asyncHandler(async (req, res) => {
  const { shortCode } = req.params

  const orgURL = await urlRedirectionService(shortCode, req)

  return res.redirect(StatusCodes.TEMPORARY_REDIRECT, orgURL)
})
