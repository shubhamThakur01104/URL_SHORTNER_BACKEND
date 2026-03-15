import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../../src/util/ApiError.js'

describe('AppError Unit Tests', () => {
  test('Scenario 1: Should set default values when only message is provided', () => {
    const message = 'Something went wrong'
    const error = new AppError(message)

    expect(error.message).toBe(message)
    expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR) // 500
    expect(error.isOperational).toBe(true)
    expect(error.success).toBe(false)
  })

  test('Scenario 2: Should correctly override default values', () => {
    const error = new AppError('Unauthorized access', StatusCodes.UNAUTHORIZED, false, false)

    expect(error.statusCode).toBe(401)
    expect(error.isOperational).toBe(false)
    expect(error.success).toBe(false)
  })

  test('Scenario 3: Should have the correct name property', () => {
    const error = new AppError('Unauthorized', 400)
    expect(error.name).toBe('AppError')
  })

  test('Scenario 4: Should capture stack trace', () => {
    const error = new AppError('Stack trace test', 500)
    expect(error.stack).toBeDefined()
  })
})
