import { StatusCodes } from 'http-status-codes'

export class AppError extends Error {
  constructor(
    message,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational = true,
    success = false
  ) {
    super(message)

    this.statusCode = statusCode
    this.isOperational = isOperational
    this.name = this.constructor.name
    this.success = success

    Error.captureStackTrace(this, this.constructor)
  }
}
