const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: [Number.isInteger, 'Rating must be a whole number from 1 to 5']
  },
  comment: {
    type: String,
    default: '',
    maxlength: 2000
  },
  tutorReply: {
    type: String,
    default: '',
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

reviewSchema.index({ tutor: 1, createdAt: -1 })

module.exports = mongoose.model('Review', reviewSchema)
