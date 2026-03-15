import mongoose, { Schema } from 'mongoose'

const urlSchema = new Schema(
  {
    orgURL: {
      type: String,
      required: true,
    },
    shortCode: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
    click: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

urlSchema.index({ shortCode: 1 })

const shortURL = mongoose.model('shortURL', urlSchema)

export default shortURL
