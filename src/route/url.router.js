import express from 'express'
import { shortURLGenerator } from '../controller/url.controller.js'
import { getAllURLs } from '../controller/urlList.controller.js'
import { createLimiter, redirectLimiter } from '../middleware/limiter.middleware.js'

const urlRouter = express.Router()

urlRouter.route('/').post(createLimiter, shortURLGenerator).get(redirectLimiter, getAllURLs)

export default urlRouter
