import express from 'express'
import {
  getAllDetails,
  getParticualShortCodeDetail,
  getReport,
  getURLAnalyticsTrend,
} from '../controller/analysis.controller.js'
import { redirectLimiter, reportLimiter } from '../middleware/limiter.middleware.js'

const analysisRouter = express.Router()

analysisRouter.route('/').get(redirectLimiter, getAllDetails)
analysisRouter.route('/:shortCode').get(redirectLimiter, getParticualShortCodeDetail)
analysisRouter.route('/:shortCode/trend').get(redirectLimiter, getURLAnalyticsTrend)
analysisRouter.route('/:shortCode/generateReport').get(reportLimiter, getReport)

export default analysisRouter
