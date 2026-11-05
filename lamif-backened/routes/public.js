const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Tutor = require('../models/Tutor')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const { FINISHED_STATUSES } = require('../lib/bookingLifecycle')

const shortName = name => {
  const [first, last] = String(name || 'Student').split(' ')
  return last ? `${first} ${last[0]}.` : first
}

// Live numbers and recent praise for the marketing homepage
router.get('/highlights', async (req, res) => {
  const visibleTutors = { verificationStatus: 'approved' }
  const [tutors, students, sessionsCompleted, ratingRows, subjectRows, reviews] = await Promise.all([
    Tutor.countDocuments(visibleTutors),
    User.countDocuments({ role: 'student' }),
    Booking.countDocuments({ status: { $in: FINISHED_STATUSES } }),
    Review.aggregate([{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Tutor.aggregate([
      { $match: visibleTutors },
      { $unwind: '$subjects' },
      { $group: { _id: { $toLower: '$subjects' }, name: { $first: '$subjects' }, tutors: { $sum: 1 } } },
      { $sort: { tutors: -1, name: 1 } }
    ]),
    Review.find({ rating: { $gte: 4 }, comment: { $ne: '' } })
      .sort({ rating: -1, createdAt: -1 })
      .limit(3)
      .populate('reviewer', 'name')
      .populate({ path: 'tutor', select: 'user', populate: { path: 'user', select: 'name' } })
      .populate('booking', 'subject')
  ])

  res.json({
    tutors,
    students,
    sessionsCompleted,
    averageRating: ratingRows[0] ? Math.round(ratingRows[0].average * 10) / 10 : null,
    reviewCount: ratingRows[0]?.count || 0,
    subjects: subjectRows.map(row => ({ name: row.name, tutors: row.tutors })),
    reviews: reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      studentName: shortName(review.reviewer?.name),
      tutorName: review.tutor?.user?.name,
      tutorId: review.tutor?._id,
      subject: review.booking?.subject
    }))
  })
})

module.exports = router
