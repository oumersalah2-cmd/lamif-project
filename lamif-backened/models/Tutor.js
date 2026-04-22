const mongoose = require('mongoose')

const tutorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: {
    type: String,
    required: true
  },
  subjects: {
    type: [String],
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  education: {
    type: String,
    required: true
  },
  cvUrl: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Tutor = mongoose.model('Tutor', tutorSchema)

module.exports = Tutor