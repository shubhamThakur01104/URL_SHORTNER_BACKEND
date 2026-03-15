import mongoose from 'mongoose'
import logger from '../util/logger.js'
import { ENV } from '../util/env.js'

export const connectDB = () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      const connectionString = mongoose.connect(ENV.MONGODB_URI)
      return connectionString
    }
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}
