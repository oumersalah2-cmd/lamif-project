const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const { FINISHED_STATUSES } = require('./bookingLifecycle')

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000 // Ethiopia does not observe DST

const emptyStats = () => ({
  completedSessions: 0,
  totalStudents: 0,
  repeatStudents: 0,
  activeStudents: 0,
  averageRating: null,
  reviewCount: 0,
  jobSuccessScore: null
})

// Everything here is derived from bookings and reviews; none of it is editable by the tutor.
// Returns a Map of tutorId (string) -> stats.
async function getTutorStats(tutorIds) {
  const ids = tutorIds.map(id => new mongoose.Types.ObjectId(String(id)))
  const stats = new Map(ids.map(id => [String(id), emptyStats()]))
  if (ids.length === 0) return stats

  const [bookingRows, reviewRows] = await Promise.all([
    Booking.aggregate([
      { $match: { tutor: { $in: ids } } },
      {
        $project: {
          tutor: 1,
          student: 1,
          status: 1,
          wasAccepted: { $in: ['accepted', { $ifNull: ['$statusHistory.status', []] }] }
        }
      },
      {
        $group: {
          _id: { tutor: '$tutor', student: '$student', status: '$status', wasAccepted: '$wasAccepted' },
          count: { $sum: 1 }
        }
      }
    ]),
    Review.aggregate([
      { $match: { tutor: { $in: ids } } },
      {
        $group: {
          _id: '$tutor',
          average: { $avg: '$rating' },
          count: { $sum: 1 },
          poor: { $sum: { $cond: [{ $lt: ['$rating', 4] }, 1, 0] } }
        }
      }
    ])
  ])

  const finishedByStudent = new Map() // tutorId -> Map(studentId -> finished sessions)
  const activeStudents = new Map() // tutorId -> Set(studentId)
  const cancelledAfterAccept = new Map()

  for (const { _id, count } of bookingRows) {
    const tutorId = String(_id.tutor)
    const studentId = String(_id.student)
    if (FINISHED_STATUSES.includes(_id.status)) {
      if (!finishedByStudent.has(tutorId)) finishedByStudent.set(tutorId, new Map())
      const perStudent = finishedByStudent.get(tutorId)
      perStudent.set(studentId, (perStudent.get(studentId) || 0) + count)
    } else if (_id.status === 'in_progress') {
      if (!activeStudents.has(tutorId)) activeStudents.set(tutorId, new Set())
      activeStudents.get(tutorId).add(studentId)
    } else if (_id.status === 'cancelled' && _id.wasAccepted) {
      cancelledAfterAccept.set(tutorId, (cancelledAfterAccept.get(tutorId) || 0) + count)
    }
  }

  const reviewsByTutor = new Map(reviewRows.map(row => [String(row._id), row]))

  for (const [tutorId, s] of stats) {
    const perStudent = finishedByStudent.get(tutorId) || new Map()
    const counts = [...perStudent.values()]
    s.completedSessions = counts.reduce((sum, n) => sum + n, 0)
    s.totalStudents = perStudent.size
    s.repeatStudents = counts.filter(n => n > 1).length
    s.activeStudents = activeStudents.get(tutorId)?.size || 0

    const reviews = reviewsByTutor.get(tutorId)
    if (reviews) {
      s.averageRating = Math.round(reviews.average * 10) / 10
      s.reviewCount = reviews.count
    }

    // Share of engagements that ended well: finished without a sub-4-star review,
    // out of everything that was finished or cancelled after the tutor accepted
    const ended = s.completedSessions + (cancelledAfterAccept.get(tutorId) || 0)
    if (s.completedSessions > 0) {
      s.jobSuccessScore = Math.round(100 * (s.completedSessions - (reviews?.poor || 0)) / ended)
    }
  }

  return stats
}

function getBadges(tutor, stats) {
  const badges = []
  if (tutor.verificationStatus === 'approved') badges.push('verified')
  const rating = stats.averageRating ?? 5
  const jss = stats.jobSuccessScore ?? 100
  if (stats.completedSessions >= 10 && rating >= 4.7 && jss >= 90) {
    badges.push('top_rated')
  } else if (stats.completedSessions >= 1 && rating >= 4.5 && jss >= 80) {
    badges.push('rising_talent')
  }
  return badges
}

const toMinutes = hhmm => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// 'unavailable' | 'fully_booked' | 'available_now' | 'available'
function getAvailabilityStatus(tutor, activeStudents, now = new Date()) {
  if (!tutor.isAvailable) return 'unavailable'
  if (activeStudents >= tutor.maxActiveStudents) return 'fully_booked'
  const eat = new Date(now.getTime() + EAT_OFFSET_MS)
  const day = eat.getUTCDay()
  const minutes = eat.getUTCHours() * 60 + eat.getUTCMinutes()
  const inSlot = (tutor.availability || []).some(slot =>
    slot.day === day && toMinutes(slot.start) <= minutes && minutes < toMinutes(slot.end))
  return inSlot ? 'available_now' : 'available'
}

// Attach stats, badges and availability to tutor documents for API responses
async function withTutorStats(tutors) {
  const stats = await getTutorStats(tutors.map(t => t._id))
  return tutors.map(tutor => {
    const s = stats.get(String(tutor._id))
    const plain = typeof tutor.toObject === 'function' ? tutor.toObject() : tutor
    return {
      ...plain,
      stats: s,
      badges: getBadges(tutor, s),
      availabilityStatus: getAvailabilityStatus(tutor, s.activeStudents)
    }
  })
}

module.exports = { getTutorStats, getBadges, getAvailabilityStatus, withTutorStats }
