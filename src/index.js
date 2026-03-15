import express from 'express'
import { ENV } from './util/env.js'
import logger from './util/logger.js'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './db/connection.db.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import urlRouter from './route/url.router.js'
import analysisRouter from './route/analysis.router.js'
import redirectionRouter from './route/redirection.router.js'

export const app = express()

const PORT = ENV.PORT

app.set('trust proxy', 1)

const corsOptions = {
  origin: ENV.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const startServer = async () => {
  try {
    await connectDB()

    app.use('/api/v1/url', urlRouter)
    app.use('/', redirectionRouter)
    app.use('/api/v1/analysis', analysisRouter)

    app.use(errorMiddleware)

    app.listen(PORT, () => {
      logger.info(`Server is running on PORT : ${PORT}`)
    })
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

startServer()
