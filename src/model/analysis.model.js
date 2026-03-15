import mongoose from 'mongoose'

const analyticsSchema = new mongoose.Schema(
  {
    shortUrlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shortURL',
      required: true,
      index: true,
    },
    clickDate: {
      type: Date,
      default: Date.now,
    },
    ip: String,
    city: String,
    country: String,
    region: String,
    device: {
      type: String,
      enum: ['Desktop', 'Mobile', 'Tablet', 'Other'],
    },
    browser: String,
    os: String,
    referrer: {
      type: String,
      default: 'Direct',
    },
  },
  { timestamps: true }
)

analyticsSchema.index({ shortUrlId: 1, clickDate: -1 })

const Analytics = mongoose.model('Analytics', analyticsSchema)

export default Analytics
