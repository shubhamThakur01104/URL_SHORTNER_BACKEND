// const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// export const encodeBase62 = (num) => {
//     let result = ''

//     while (num > 0) {
//         result = charset[num % 62] + result

//         num = Math.floor(num / 62)
//     }

//     return result
// }

const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const encodeBase62 = (num) => {
  if (num <= 0) return ''

  // 2. 'BigInt' use kiya taaki bade numbers crash na karein
  let n = BigInt(num)
  const base = BigInt(62)
  let result = ''

  while (n > 0n) {
    // n % base se hum index nikalte hain
    result = charset[Number(n % base)] + result
    n = n / base // BigInt division apne aap Math.floor kar deta hai
  }

  return result
}
