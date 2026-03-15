import { validateURL, validMongooseId, validShortCode } from '../../../src/util/validation.js'

describe('Testing all validation functions', () => {
  describe('Short Code validation Testing', () => {
    test.each([['abceDEf'], ['13422'], ['ab12'], ['1Bjloij2d']])(
      "Should return '%s' when shortCode is valid",
      (value) => {
        expect(validShortCode(value)).toBe(value)
      }
    )

    test.each([
      ['a'],
      ['ab2'],
      ['@!@$2'],
      ['!2keD@'],
      [null],
      [undefined],
      ['     '],
      ['javascript:alert(1)'],
    ])("Should throw error for invalid input: '%s'", (value) => {
      expect(() => validShortCode(value)).toThrow()
    })
  })

  describe('Mongoose Id validation Testing', () => {
    test('Positive: Should return true for a valid ObjectId', () => {
      const validId = '60d5ec186641f92e2c8f6c4a'

      expect(validMongooseId(validId)).toBe(validId)
    })

    describe('Negative Scenarios', () => {
      test.each([
        ['12345'],
        ['60d5ec186641f92e2c8f6c4aa'],
        ['60d5ec186641f92e2c8f6c4@'],
        ['60d5ec186641f92e2c8f6c4z'],
        ['                        '],
        [null],
        [undefined],
      ])("Should throw error for invalid ObjectId: '%s'", (invalidId) => {
        expect(() => validMongooseId(invalidId)).toThrow()
      })
    })
  })

  describe('URL Validation Testing', () => {
    const validURLs = [
      'https://google.com',
      'https://dev.api.example.org/v2?user=sonu',
      'http://localhost:5000',
      'https://my-site.photography/portfolio',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '   https://www.amazon.in/s?k=laptop&ref=nb_sb_noss_2 ',
      'https://maps.google.com/?q=delhi+india&z=10',
    ]

    test.each(validURLs)('Testing function which validate the url', (inputURL) => {
      const result = validateURL(inputURL)

      expect(typeof result).toBe('string')

      expect(result.startsWith('http')).toBe(true)

      if (result.endsWith('/') && !inputURL.includes('?')) {
        expect(result.endsWith('/')).toBe(false)
      }
    })

    const invalidURLs = [
      'not-a-url',
      'http://',
      '   ',
      'javascript:alert(1)',
      'https://google..com',
      'http://example.com:99999',
    ]

    test.each(invalidURLs)('Should throw AppError for invalid URL: %s', (input) => {
      expect(() => validateURL(input)).toThrow()
    })
  })
})
