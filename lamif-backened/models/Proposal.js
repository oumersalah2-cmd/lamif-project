const mongoose = require('mongoose')

const proposalSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  coverLetter: {
    type: String,
    required: true,
    maxlength: 5000
  },
  // The hourly rate the tutor is offering for this job; locked into the booking if hired
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['submitted', 'accepted', 'declined', 'withdrawn'],
    default: 'submitted'
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

proposalSchema.index({ job: 1, tutor: 1 }, { unique: true })

module.exports = mongoose.model('Proposal', proposalSchema)
