import { asyncHandler } from '../../../src/util/asyncHandler.js'

describe('Testing asyncHandler Utility', () => {
  // Har test se pehle humein nakli Req, Res, Next chahiye
  let req, res, next

  beforeEach(() => {
    req = {}
    res = {}
    next = jest.fn()
  })

  test('Mission 1: Should execute the passed function (fn)', async () => {
    const mockFn = jest.fn().mockResolvedValue('Success')

    const wrapped = asyncHandler(mockFn)
    await wrapped(req, res, next)

    expect(mockFn).toHaveBeenCalledWith(req, res, next)
  })

  test('Mission 2: Should catch error and pass it to next()', async () => {
    const error = new Error('Controller Phat Gaya!')
    const mockFn = jest.fn().mockRejectedValue(error)
    const wrapped = asyncHandler(mockFn)
    await wrapped(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
