import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../../src/util/ApiResponse.js'

describe('Testing ApiResponse Class', () => {
  test('Scenario 1: Should set default value when only statuscode provide.', () => {
    const response = new ApiResponse(StatusCodes.OK)

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.message).toBe('')
    expect(response.success).toBeTruthy()
    expect(response.data).toBeNull()
  })

  test('Scenario 2: Should set the value which I provide', () => {
    const response = new ApiResponse(StatusCodes.OK, 'URL Created Successfully')

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.message).toBe('URL Created Successfully')
    expect(response.success).toBe(true)
  })

  test('Scenario 3: Should override the value of Data', () => {
    const data = {
      url: 'http://www.google.com',
      shortURL: 'http://localhost:5000/4kf3',
    }

    const response = new ApiResponse(StatusCodes.OK, 'Data fetched Successfully', data)

    expect(response.data).toEqual(data)
  })

  test('Scenario 4: Should override the success value', () => {
    const response = new ApiResponse(StatusCodes.BAD_REQUEST, 'Failed', null, false)

    expect(response.success).toBe(false)
  })
})
