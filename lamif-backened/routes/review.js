const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const Tutor = require('../models/Tutor')
const protect = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const httpError = require('../lib/httpError')
const notify = require('../lib/notify')

// Leaving a review is the only way a booking reaches 'reviewed'
router.post('/', protect, requireRole('student'), async (req, res) => {
  const { bookingId, rating, comment } = req.body

  const booking = await Booking.findById(bookingId)
  if (!booking || String(booking.student) !== req.user.id) throw httpError(404, 'Booking not found')
  if (booking.status !== 'completed') throw httpError(400, 'You can review a session once it is completed')

  const review = await Review.create({
    booking: booking._id,
    reviewer: req.user.id,
    tutor: booking.tutor,
    rating: Number(rating),
    comment: comment || ''
  })

  booking.status = 'reviewed'
  booking.statusHistory.push({ status: 'reviewed', by: req.user.id })
  await booking.save()

  const tutor = await Tutor.findById(booking.tutor)
  await notify(tutor.user, 'review_received', `You received a ${review.rating}-star review for ${booking.subject}`, `/tutors/${tutor._id}`)

  res.status(201).json({ message: 'Thanks for your feedback!', review })
})

// The tutor can publicly respond to a review once
router.put('/:id/reply', protect, requireRole('tutor'), async (req, res) => {
  const reply = String(req.body.reply || '').trim()
  if (!reply) throw httpError(400, 'Write a reply first')

  const review = await Review.findById(req.params.id).populate('tutor', 'user')
  if (!review || String(review.tutor.user) !== req.user.id) throw httpError(404, 'Review not found')
  if (review.tutorReply) throw httpError(400, 'You already replied to this review')

  review.tutorReply = reply
  await review.save()
  res.json({ message: 'Reply posted', review })
})

module.exports = router
