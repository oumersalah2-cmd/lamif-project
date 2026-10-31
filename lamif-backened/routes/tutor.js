const express = require('express')
const router = express.Router()
const Tutor = require('../models/Tutor')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const protect = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')
const httpError = require('../lib/httpError')
const { withTutorStats } = require('../lib/tutorStats')
const { FINISHED_STATUSES } = require('../lib/bookingLifecycle')

const profileUploads = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 }
])

// Multipart forms send everything as strings; turn them back into the shapes the model expects
const parseList = value => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) return JSON.parse(trimmed)
  return trimmed.split(',').map(s => s.trim()).filter(Boolean)
}

const parseNumber = value => (value === undefined || value === '' ? undefined : Number(value))

const parseBoolean = value => (value === undefined ? undefined : value === true || value === 'true')

function profileFieldsFromRequest(body, files) {
  const fields = {
    headline: body.headline,
    bio: body.bio,
    education: body.education,
    location: body.location,
    subjects: parseList(body.subjects),
    languages: parseList(body.languages),
    teachingModes: parseList(body.teachingModes),
    hourlyRateOnline: parseNumber(body.hourlyRateOnline ?? body.hourlyRate),
    hourlyRateInPerson: parseNumber(body.hourlyRateInPerson),
    maxActiveStudents: parseNumber(body.maxActiveStudents),
    isAvailable: parseBoolean(body.isAvailable),
    availability: typeof body.availability === 'string' ? JSON.parse(body.availability) : body.availability
  }
  if (files?.cv) fields.cvUrl = `/uploads/${files.cv[0].filename}`
  if (files?.profilePicture) fields.profilePictureUrl = `/uploads/${files.profilePicture[0].filename}`

  for (const key of Object.keys(fields)) {
    if (fields[key] === undefined) delete fields[key]
  }
  return fields
}

router.post('/profile', protect, requireRole('tutor'), profileUploads, async (req, res) => {
  const existingProfile = await Tutor.findOne({ user: req.user.id })
  if (existingProfile) throw httpError(400, 'Tutor profile already exists')

  const tutor = await Tutor.create({ user: req.user.id, ...profileFieldsFromRequest(req.body, req.files) })
  res.status(201).json({ message: 'Tutor profile created successfully', tutor })
})

router.put('/profile', protect, requireRole('tutor'), profileUploads, async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) throw httpError(404, 'Create your tutor profile first')

  tutor.set(profileFieldsFromRequest(req.body, req.files))
  await tutor.save()
  res.json({ message: 'Profile updated', tutor })
})

router.get('/me', protect, requireRole('tutor'), async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id }).populate('user', 'name email')
  if (!tutor) throw httpError(404, 'Tutor profile not found')
  const [withStats] = await withTutorStats([tutor])
  res.json({ tutor: withStats })
})

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const SORTERS = {
  best_match: (a, b) => (b.stats.jobSuccessScore ?? 0) - (a.stats.jobSuccessScore ?? 0) ||
    (b.stats.averageRating ?? 0) - (a.stats.averageRating ?? 0),
  rating: (a, b) => (b.stats.averageRating ?? 0) - (a.stats.averageRating ?? 0) || b.stats.reviewCount - a.stats.reviewCount,
  price_low: (a, b) => (a.hourlyRateOnline ?? a.hourlyRateInPerson ?? 0) - (b.hourlyRateOnline ?? b.hourlyRateInPerson ?? 0),
  price_high: (a, b) => (b.hourlyRateOnline ?? b.hourlyRateInPerson ?? 0) - (a.hourlyRateOnline ?? a.hourlyRateInPerson ?? 0),
  sessions: (a, b) => b.stats.completedSessions - a.stats.completedSessions,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
}

// Search: ?q=&subject=&mode=online|in_person&minRate=&maxRate=&minRating=&verified=true&availableNow=true&sort=
router.get('/all', async (req, res) => {
  const { q, subject, mode, minRate, maxRate, minRating, verified, availableNow, sort } = req.query
  const filter = { isAvailable: true, verificationStatus: { $ne: 'rejected' } }

  if (verified === 'true') filter.verificationStatus = 'approved'
  if (subject) filter.subjects = { $regex: `^${escapeRegex(subject)}$`, $options: 'i' }
  if (mode) filter.teachingModes = mode

  const rateField = mode === 'in_person' ? 'hourlyRateInPerson' : 'hourlyRateOnline'
  if (minRate || maxRate) {
    filter[rateField] = {}
    if (minRate) filter[rateField].$gte = Number(minRate)
    if (maxRate) filter[rateField].$lte = Number(maxRate)
  }

  let tutors = await Tutor.find(filter).populate('user', 'name')

  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i')
    tutors = tutors.filter(t => [t.user?.name, t.headline, t.bio, t.education, ...t.subjects].some(text => pattern.test(text || '')))
  }

  let results = await withTutorStats(tutors)
  if (minRating) results = results.filter(t => (t.stats.averageRating ?? 0) >= Number(minRating))
  if (availableNow === 'true') results = results.filter(t => t.availabilityStatus === 'available_now')
  results.sort(SORTERS[sort] || SORTERS.best_match)

  res.status(200).json({ tutors: results })
})

// Distinct subjects for filter dropdowns
router.get('/subjects', async (req, res) => {
  const subjects = await Tutor.distinct('subjects', { verificationStatus: { $ne: 'rejected' } })
  res.json({ subjects: subjects.sort((a, b) => a.localeCompare(b)) })
})

// Public profile, including the system-generated work history
router.get('/:id', async (req, res) => {
  const tutor = await Tutor.findById(req.params.id).populate('user', 'name')
  if (!tutor || tutor.verificationStatus === 'rejected') throw httpError(404, 'Tutor not found')

  const [[withStats], finishedBookings] = await Promise.all([
    withTutorStats([tutor]),
    Booking.find({ tutor: tutor._id, status: { $in: FINISHED_STATUSES } })
      .sort({ endUtc: -1, createdAt: -1 })
      .limit(50)
      .populate('student', 'name')
  ])

  const reviews = await Review.find({ booking: { $in: finishedBookings.map(b => b._id) } })
  const reviewByBooking = new Map(reviews.map(r => [String(r.booking), r]))

  // Students are shown by first name and initial, as on most marketplaces
  const shortName = name => {
    const [first, last] = String(name || 'Student').split(' ')
    return last ? `${first} ${last[0]}.` : first
  }

  const workHistory = finishedBookings.map(booking => {
    const review = reviewByBooking.get(String(booking._id))
    return {
      id: booking._id,
      subject: booking.subject,
      mode: booking.mode,
      date: booking.endUtc || booking.createdAt,
      studentName: shortName(booking.student?.name),
      rating: review?.rating ?? null,
      comment: review?.comment ?? '',
      tutorReply: review?.tutorReply ?? ''
    }
  })

  res.status(200).json({ tutor: withStats, workHistory })
})

module.exports = router
