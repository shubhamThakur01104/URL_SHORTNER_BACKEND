import express from 'express'
import { urlRedirection } from '../controller/url.controller.js'
import { redirectLimiter } from '../middleware/limiter.middleware.js'

const redirectionRouter = express.Router()

redirectionRouter.route('/:shortCode').get(redirectLimiter, urlRedirection)

export default redirectionRouter
