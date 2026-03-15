import mongoose, { Schema } from 'mongoose'

const counterSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  counter: {
    type: Number,
    default: 0,
  },
})

const Counter = mongoose.model('Counter', counterSchema)

export default Counter
