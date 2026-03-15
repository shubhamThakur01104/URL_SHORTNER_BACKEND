import { encodeBase62 } from '../../../src/util/hashGenerator.js'

describe('Testing Base62 Encoding Logic (BigInt Version)', () => {
  test('Should encode single digit numbers correctly', () => {
    expect(encodeBase62(1n)).toBe('1')
    expect(encodeBase62(10n)).toBe('a')
    expect(encodeBase62(61n)).toBe('Z')
  })

  test('Should handle the 62nd number boundary', () => {
    expect(encodeBase62(62n)).toBe('10')
  })

  test('Should encode large numbers correctly with BigInt', () => {
    expect(encodeBase62(125n)).toBe('21')
    expect(encodeBase62(999n)).toBe('g7')

    const massiveNum = BigInt('403423940920940920939040924909204')
    expect(encodeBase62(massiveNum)).toBe('2cuq6W45EXvCXWk22MY')
  })

  test('Edge Case: Should handle zero or negative numbers', () => {
    expect(encodeBase62(0n)).toBe('')
    expect(encodeBase62(-5n)).toBe('')
  })
})
