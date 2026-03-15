import z from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { AppError } from './ApiError.js'
import mongoose from 'mongoose'
import { StatusCodes } from 'http-status-codes'

// export const validFullName = (fullName) => {

//     const schema = z.object({
//         firstName: z.string().trim().min(1, `First Name is required.`),
//         lastName: z.string().trim().optional()
//     })

//     if (!schema.safeParse(fullName).success) {
//         throw new AppError("Invalid Full Name", StatusCodes.BAD_REQUEST)
//     }
//     return fullName

// }

// export const validEmail = (email) => {
//     const schema = z.string().email("Invalid email format")

//     if (!schema.safeParse(email).success) {
//         throw new AppError("Invalid Email", StatusCodes.BAD_REQUEST)
//     }
//     return email
// }

// export const validContactNo = (contactNo) => {
//     const phone = parsePhoneNumberFromString(contactNo, "IN")

//     if (!phone || !phone.isValid()) {
//         throw new AppError("Invalid Contact Number", 400)
//     }

//     return phone.number
// }

// export const validPassword = (password) => {
//     const schema = z.string()
//         .min(8, "Password must be at least 8 characters")
//         .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
//         .regex(/[a-z]/, "Password must contain at least one lowercase letter")
//         .regex(/[0-9]/, "Password must contain at least one number")
//         .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

//     if (!schema.safeParse(password).success) {
//         throw new AppError("Invalid Password", StatusCodes.BAD_REQUEST)
//     }
//     return password
// }

export const validMongooseId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid ID', StatusCodes.BAD_REQUEST)
  }

  return id
}

export const validShortCode = (shortCode) => {
  const schema = z
    .string()
    .min(4)
    .regex(/^[a-zA-Z0-9]+$/, 'Special characters are not allowed')

  if (!schema.safeParse(shortCode).success) {
    throw new AppError('Invalid Short URL', StatusCodes.NOT_ACCEPTABLE)
  }
  return shortCode
}

export const validateURL = (url) => {
  try {
    if (url.includes('..') || (!url.includes('.') && !url.includes('localhost'))) {
      throw new AppError('Invalid URL format')
    }
    const hasProtocol = url.trim().startsWith('http://') || url.trim().startsWith('https://')

    if (!hasProtocol) {
      url = `https://${url}`
    }

    const cleanURL = new URL(url)

    const parsedURL =
      cleanURL.origin +
      (cleanURL.pathname === '/' ? '' : cleanURL.pathname) +
      cleanURL.search +
      cleanURL.hash

    return parsedURL
  } catch (error) {
    throw new AppError(error.message || 'Invalid URL', StatusCodes.BAD_REQUEST)
  }
}
