const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Tutor = require('../models/Tutor')
const Review = require('../models/Review')
const protect = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const requireVerified = require('../middleware/requireVerified')
const httpError = require('../lib/httpError')
const notify = require('../lib/notify')
const createBooking = require('../lib/createBooking')
const { assertTutorFree } = createBooking
const { canTransition, nextStatuses } = require('../lib/bookingLifecycle')

const STATUS_MESSAGES = {
  accepted: 'accepted your booking request',
  rejected: 'declined your booking request',
  cancelled: 'cancelled the booking',
  paid: 'confirmed payment for your booking',
  in_progress: 'started your session',
  completed: 'marked the session as completed'
}

// Adds what the viewer can do next, and the review if one exists
async function present(bookings, side) {
  const reviews = await Review.find({ booking: { $in: bookings.map(b => b._id) } })
  const reviewByBooking = new Map(reviews.map(r => [String(r.booking), r]))
  return bookings.map(booking => ({
    ...booking.toObject(),
    review: reviewByBooking.get(String(booking._id)) || null,
    nextStatuses: nextStatuses(booking.status, side),
    canReview: side === 'student' && booking.status === 'completed'
  }))
}

router.post('/hire', protect, requireRole('student'), requireVerified, async (req, res) => {
  const { tutorId, subject, message, mode = 'online', startUtc, endUtc } = req.body

  const tutor = await Tutor.findById(tutorId)
  if (!tutor || tutor.verificationStatus === 'rejected') throw httpError(404, 'Tutor not found')

  const booking = await createBooking({ studentId: req.user.id, tutor, subject, message, mode, startUtc, endUtc })
  res.status(201).json({ message: 'Booking request sent successfully', booking })
})

router.get('/my-bookings', protect, requireRole('student'), async (req, res) => {
  const bookings = await Booking.find({ student: req.user.id })
    .sort({ startUtc: -1, createdAt: -1 })
    .populate({
      path: 'tutor',
      select: 'user profilePictureUrl headline',
      populate: { path: 'user', select: 'name email' }
    })

  res.status(200).json({ bookings: await present(bookings, 'student') })
})

router.get('/tutor-bookings', protect, requireRole('tutor'), async (req, res) => {
  const tutorProfile = await Tutor.findOne({ user: req.user.id })
  if (!tutorProfile) throw httpError(404, 'Tutor profile not found')

  const bookings = await Booking.find({ tutor: tutorProfile._id })
    .sort({ startUtc: -1, createdAt: -1 })
    .populate('student', 'name email')

  res.status(200).json({ bookings: await present(bookings, 'tutor') })
})

router.put('/status/:id', protect, async (req, res) => {
  const { status } = req.body

  const booking = await Booking.findById(req.params.id).populate('tutor', 'user')
  if (!booking) throw httpError(404, 'Booking not found')

  let side
  if (String(booking.student) === req.user.id) side = 'student'
  else if (String(booking.tutor.user) === req.user.id) side = 'tutor'
  else throw httpError(403, 'This is not your booking')

  if (!canTransition(booking.status, status, side)) {
    throw httpError(400, `You cannot change a ${booking.status.replace('_', ' ')} booking to ${String(status).replace('_', ' ')}`)
  }

  if (status === 'accepted' && booking.startUtc) {
    await assertTutorFree(booking.tutor._id, booking.startUtc, booking.endUtc, booking._id)
  }

  booking.status = status
  booking.statusHistory.push({ status, by: req.user.id })
  await booking.save()

  const otherParty = side === 'student' ? booking.tutor.user : booking.student
  const actor = side === 'student' ? 'The student' : 'Your tutor'
  await notify(otherParty, `booking_${status}`, `${actor} ${STATUS_MESSAGES[status]} (${booking.subject})`, '/dashboard')

  res.status(200).json({ message: 'Booking status updated', booking })
})

module.exports = router
