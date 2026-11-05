const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const Tutor = require('../models/Tutor')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const protect = require('../middleware/authMiddleware')
const optionalAuth = require('../middleware/optionalAuth')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')
const httpError = require('../lib/httpError')
const { withTutorStats } = require('../lib/tutorStats')
const { FINISHED_STATUSES } = require('../lib/bookingLifecycle')

const profileUploads = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 },
  { name: 'certificateFiles', maxCount: 10 }
])

// Multipart forms send everything as strings; turn them back into the shapes the model expects
const parseList = value => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean)
}

const parseAvailability = value => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    throw httpError(400, 'Availability is not valid')
  }
}

const parseNumber = value => (value === undefined || value === '' || value === null ? undefined : Number(value))

const parseBoolean = value => (value === undefined ? undefined : value === true || value === 'true')

const normalizeId = id => (id ? String(id).trim().toUpperCase() : '')
const normalizePhone = phone => (phone ? String(phone).replace(/[\s\-\(\)\.]/g, '') : '')

async function assertNoDuplicateApplication(tutorId, idNumber, phoneNumber) {
  const normId = normalizeId(idNumber)
  const normPhone = normalizePhone(phoneNumber)
  if (!normId && !normPhone) return

  const orConditions = []
  if (normId) orConditions.push({ idNumber: normId })
  if (normPhone) orConditions.push({ phoneNumber: normPhone })

  const conflict = await Tutor.findOne({
    _id: { $ne: tutorId },
    verificationStatus: { $nin: ['draft'] },
    $or: orConditions
  })

  if (conflict) {
    if (normId && conflict.idNumber === normId) {
      throw httpError(409, 'An application with this National / Kebele ID number already exists.')
    }
    if (normPhone && conflict.phoneNumber === normPhone) {
      throw httpError(409, 'An application with this Phone number already exists.')
    }
  }
}

function parseCertificates(body, files, existingCertificates = []) {
  let certList = []
  if (typeof body.certificates === 'string') {
    try {
      certList = JSON.parse(body.certificates)
    } catch {
      certList = []
    }
  } else if (Array.isArray(body.certificates)) {
    certList = body.certificates
  } else {
    certList = existingCertificates
  }

  const uploadedCertFiles = files?.certificateFiles || []
  let uploadIndex = 0
  // Never trust a file name from the request body: it could point at someone else's private document
  const ownFiles = new Set(existingCertificates.map(c => c.file).filter(Boolean))

  return certList.map((cert, index) => {
    let file = ownFiles.has(cert.file) ? cert.file : (existingCertificates[index]?.file || '')
    // If a new file was uploaded at this slot
    if (uploadedCertFiles[uploadIndex]) {
      file = uploadedCertFiles[uploadIndex].filename
      uploadIndex++
    }
    return {
      name: cert.name || `Certificate ${index + 1}`,
      issuer: cert.issuer || '',
      year: cert.year ? Number(cert.year) : undefined,
      file
    }
  })
}

function profileFieldsFromRequest(body, files, existingTutor = null) {
  const fields = {
    headline: body.headline,
    bio: body.bio,
    education: body.education,
    location: body.location,
    teachingStatement: body.teachingStatement,
    phoneNumber: body.phoneNumber ? normalizePhone(body.phoneNumber) : undefined,
    idNumber: body.idNumber ? normalizeId(body.idNumber) : undefined,
    experienceYears: parseNumber(body.experienceYears),
    agreementAccepted: parseBoolean(body.agreementAccepted),
    subjects: parseList(body.subjects),
    languages: parseList(body.languages),
    teachingModes: parseList(body.teachingModes),
    hourlyRateOnline: parseNumber(body.hourlyRateOnline ?? body.hourlyRate),
    hourlyRateInPerson: parseNumber(body.hourlyRateInPerson),
    maxActiveStudents: parseNumber(body.maxActiveStudents),
    isAvailable: parseBoolean(body.isAvailable),
    availability: parseAvailability(body.availability)
  }

  if (body.certificates !== undefined || files?.certificateFiles) {
    fields.certificates = parseCertificates(body, files, existingTutor?.certificates || [])
  }

  if (files?.cv) fields.cvUrl = `/uploads/${files.cv[0].filename}`
  if (files?.profilePicture) fields.profilePictureUrl = `/uploads/${files.profilePicture[0].filename}`
  if (files?.idDocument) fields.idDocumentFile = files.idDocument[0].filename

  for (const key of Object.keys(fields)) {
    if (fields[key] === undefined) delete fields[key]
  }
  return fields
}

function validateSubmissionFields(fields, existingTutor = null) {
  const merged = { ...(existingTutor ? existingTutor.toObject() : {}), ...fields }

  if (!merged.phoneNumber || !merged.phoneNumber.trim()) {
    throw httpError(400, 'Phone number is required to submit your application')
  }
  if (!merged.idNumber || !merged.idNumber.trim()) {
    throw httpError(400, 'National / Kebele ID number is required to submit your application')
  }
  if (!merged.idDocumentFile) {
    throw httpError(400, 'A photo or document of your government ID is required to submit your application')
  }
  if (!merged.bio || !merged.bio.trim()) {
    throw httpError(400, 'About you / Bio is required')
  }
  if (!merged.education || !merged.education.trim()) {
    throw httpError(400, 'Educational background is required')
  }
  if (!merged.subjects || merged.subjects.length === 0) {
    throw httpError(400, 'Please add at least one subject you can teach')
  }
  if (!merged.teachingStatement || merged.teachingStatement.trim().length < 15) {
    throw httpError(400, 'Please provide a short teaching statement (at least 15 characters)')
  }
  if (!merged.agreementAccepted) {
    throw httpError(400, 'You must accept the tutor agreement and code of conduct to submit your application')
  }
}

function sanitizePublicTutor(tutor) {
  const obj = tutor.toObject ? tutor.toObject() : { ...tutor }
  delete obj.phoneNumber
  delete obj.idNumber
  delete obj.idDocumentFile
  delete obj.adminFeedback
  delete obj.agreementAccepted
  delete obj.agreementAcceptedAt
  delete obj.reapplyAllowedAt
  if (Array.isArray(obj.certificates)) {
    obj.certificates = obj.certificates.map(c => ({
      _id: c._id,
      name: c.name,
      issuer: c.issuer,
      year: c.year
      // omit c.file
    }))
  }
  return obj
}

router.post('/profile', protect, requireRole('tutor'), profileUploads, async (req, res) => {
  const existingProfile = await Tutor.findOne({ user: req.user.id })
  if (existingProfile) throw httpError(400, 'Tutor profile already exists. Use update instead.')

  const isSubmit = req.body.action === 'submit' || req.body.isDraft === 'false' || req.body.isDraft === false
  const fields = profileFieldsFromRequest(req.body, req.files)

  if (isSubmit) {
    validateSubmissionFields(fields)
    await assertNoDuplicateApplication(null, fields.idNumber, fields.phoneNumber)
    fields.verificationStatus = 'submitted'
    fields.submittedAt = new Date()
    fields.agreementAcceptedAt = new Date()
  } else {
    fields.verificationStatus = 'draft'
  }

  const tutor = await Tutor.create({ user: req.user.id, ...fields })
  res.status(201).json({
    message: isSubmit ? 'Tutor application submitted for review' : 'Tutor profile draft saved',
    tutor
  })
})

router.put('/profile', protect, requireRole('tutor'), profileUploads, async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) throw httpError(404, 'Create your tutor profile first')

  // A rejected application stays locked until the cooldown ends and the tutor reopens it via /reapply
  if (tutor.verificationStatus === 'rejected') {
    throw httpError(400, 'Your application was not approved. Use reapply once the review cooldown has ended.')
  }

  const isSubmit = req.body.action === 'submit' || req.body.isDraft === 'false' || req.body.isDraft === false
  const isDraft = req.body.action === 'draft' || req.body.isDraft === 'true' || req.body.isDraft === true
  const fields = profileFieldsFromRequest(req.body, req.files, tutor)

  if (isSubmit) {
    validateSubmissionFields(fields, tutor)
    const idNum = fields.idNumber || tutor.idNumber
    const phoneNum = fields.phoneNumber || tutor.phoneNumber
    await assertNoDuplicateApplication(tutor._id, idNum, phoneNum)
    fields.verificationStatus = 'submitted'
    fields.submittedAt = new Date()
    fields.agreementAcceptedAt = new Date()
  } else if (isDraft) {
    fields.verificationStatus = 'draft'
  }

  tutor.set(fields)
  await tutor.save()
  res.json({
    message: isSubmit ? 'Application submitted for review' : 'Profile updated',
    tutor
  })
})

router.post('/reapply', protect, requireRole('tutor'), async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) throw httpError(404, 'Tutor profile not found')
  if (tutor.verificationStatus !== 'rejected') {
    throw httpError(400, 'Only rejected applications can be reopened for reapplication')
  }
  if (tutor.reapplyAllowedAt && new Date() < new Date(tutor.reapplyAllowedAt)) {
    throw httpError(400, `You can reapply after ${new Date(tutor.reapplyAllowedAt).toLocaleDateString()}`)
  }
  tutor.verificationStatus = 'draft'
  await tutor.save()
  res.json({ message: 'Application reopened as draft. Update your details and submit when ready.', tutor })
})

router.get('/:id/document/:docType', protect, async (req, res) => {
  const tutor = await Tutor.findById(req.params.id)
  if (!tutor) throw httpError(404, 'Tutor not found')

  const isOwner = req.user && String(tutor.user) === String(req.user.id)
  const isAdmin = req.user && req.user.role === 'admin'
  if (!isOwner && !isAdmin) {
    throw httpError(403, 'Access denied. Only the applicant or an administrator can view verification documents.')
  }

  let filename
  if (req.params.docType === 'id') {
    filename = tutor.idDocumentFile
  } else if (req.params.docType === 'certificate') {
    const index = parseInt(req.query.index || '0', 10)
    filename = tutor.certificates?.[index]?.file
  }

  if (!filename) throw httpError(404, 'Document not found')

  const safeFilename = path.basename(filename)
  const filePath = path.join(upload.privateDir, safeFilename)
  if (!fs.existsSync(filePath)) throw httpError(404, 'Document file not found on disk')

  res.sendFile(filePath)
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

// Search: only approved tutors appear in public search
router.get('/all', async (req, res) => {
  const { q, subject, mode, minRate, maxRate, minRating, availableNow, sort } = req.query
  const filter = { isAvailable: true, verificationStatus: 'approved' }

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

  const sanitized = results.map(sanitizePublicTutor)
  res.status(200).json({ tutors: sanitized })
})

// Distinct subjects for filter dropdowns (only from approved tutors)
router.get('/subjects', async (req, res) => {
  const subjects = await Tutor.distinct('subjects', { verificationStatus: 'approved' })
  res.json({ subjects: subjects.sort((a, b) => a.localeCompare(b)) })
})

// Public profile, including the system-generated work history
router.get('/:id', optionalAuth, async (req, res) => {
  const tutor = await Tutor.findById(req.params.id).populate('user', 'name')
  if (!tutor) throw httpError(404, 'Tutor not found')

  const isOwner = req.user && String(tutor.user?._id || tutor.user) === String(req.user.id)
  const isAdmin = req.user && req.user.role === 'admin'

  if (tutor.verificationStatus !== 'approved' && !isOwner && !isAdmin) {
    throw httpError(404, 'Tutor not found')
  }

  const [[withStats], finishedBookings] = await Promise.all([
    withTutorStats([tutor]),
    Booking.find({ tutor: tutor._id, status: { $in: FINISHED_STATUSES } })
      .sort({ endUtc: -1, createdAt: -1 })
      .limit(50)
      .populate('student', 'name')
  ])

  const reviews = await Review.find({ booking: { $in: finishedBookings.map(b => b._id) } })
  const reviewByBooking = new Map(reviews.map(r => [String(r.booking), r]))

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

  const presentation = (isOwner || isAdmin) ? withStats : sanitizePublicTutor(withStats)
  res.status(200).json({ tutor: presentation, workHistory })
})

module.exports = router
