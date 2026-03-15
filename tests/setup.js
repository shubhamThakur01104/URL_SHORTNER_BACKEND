import { MongoMemoryServer } from 'mongodb-memory-server'
import { RedisMemoryServer } from 'redis-memory-server'
import Redis from 'ioredis'
import mongoose from 'mongoose'

let mongoServer

export const connectDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: { launchTimeoutMS: 60000 },
    })
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    const uri = mongoServer.getUri()
    await mongoose.connect(uri)
  } catch (err) {
    console.error('Mongo Error:', err)
  }
}

export const disconnectDB = async () => {
  if (mongoServer) {
    await mongoose.disconnect()
    await mongoServer.stop()
  }
}

export const clearDB = async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

let redisServer
let redisClient

export const startRedis = async () => {
  if (!redisServer) {
    redisServer = new RedisMemoryServer()
    await redisServer.start()
  }

  const host = await redisServer.getHost()
  const port = await redisServer.getPort()

  redisClient = new Redis({
    host,
    port,
  })

  return redisClient
}

export const stopRedis = async () => {
  if (redisClient && redisClient.status === 'ready') {
    await redisClient.quit()
  }

  if (redisServer) {
    await redisServer.stop()
  }
}
