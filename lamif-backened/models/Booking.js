const mongoose = require('mongoose')

// requested -> accepted -> paid -> in_progress -> completed -> reviewed,
// with rejected/cancelled as exits. 'pending' is the pre-lifecycle name for 'requested'.
const BOOKING_STATUSES = ['requested', 'accepted', 'rejected', 'cancelled', 'paid', 'in_progress', 'completed', 'reviewed', 'pending']

const bookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    enum: ['online', 'in_person'],
    default: 'online'
  },
  startUtc: Date,
  endUtc: Date,
  // Copied from the tutor's profile (or the accepted proposal) when the booking is made,
  // so later profile rate changes never touch an existing contract
  hourlyRate: {
    type: Number,
    min: 0
  },
  price: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: BOOKING_STATUSES,
    default: 'requested'
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  statusHistory: [{
    _id: false,
    status: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

bookingSchema.index({ tutor: 1, status: 1 })
bookingSchema.index({ student: 1, createdAt: -1 })

const Booking = mongoose.model('Booking', bookingSchema)

Booking.STATUSES = BOOKING_STATUSES

module.exports = Booking
