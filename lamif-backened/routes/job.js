const express = require('express')
const router = express.Router()
const Job = require('../models/Job')
const Proposal = require('../models/Proposal')
const Tutor = require('../models/Tutor')
const protect = require('../middleware/authMiddleware')
const optionalAuth = require('../middleware/optionalAuth')
const requireRole = require('../middleware/requireRole')
const requireVerified = require('../middleware/requireVerified')
const httpError = require('../lib/httpError')
const notify = require('../lib/notify')
const { withTutorStats } = require('../lib/tutorStats')

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const optionalNumber = value => (value === undefined || value === '' || value === null ? undefined : Number(value))

async function proposalCounts(jobIds) {
  const rows = await Proposal.aggregate([
    { $match: { job: { $in: jobIds }, status: { $ne: 'withdrawn' } } },
    { $group: { _id: '$job', count: { $sum: 1 } } }
  ])
  return new Map(rows.map(r => [String(r._id), r.count]))
}

const withCounts = async jobs => {
  const counts = await proposalCounts(jobs.map(j => j._id))
  return jobs.map(job => ({ ...job.toObject(), proposalCount: counts.get(String(job._id)) || 0 }))
}

router.post('/', protect, requireRole('student'), requireVerified, async (req, res) => {
  const {
    title,
    description,
    subject,
    level,
    mode,
    budgetMin,
    budgetMax,
    location,
    phoneNumber,
    studentName,
    preferredSchedule,
    preferredGender,
    status
  } = req.body

  const job = await Job.create({
    student: req.user.id,
    title,
    description,
    subject,
    level,
    mode,
    budgetMin: optionalNumber(budgetMin),
    budgetMax: optionalNumber(budgetMax),
    location: location || '',
    phoneNumber: phoneNumber || '',
    studentName: studentName || '',
    preferredSchedule: preferredSchedule || '',
    preferredGender: preferredGender || 'any',
    status: status || 'open'
  })
  res.status(201).json({ message: 'Job posted', job })
})

// Open job feed for tutors: ?q=&subject=&mode=&level=
router.get('/', async (req, res) => {
  const { q, subject, mode, level } = req.query
  const filter = { status: 'open' }
  if (subject) filter.subject = { $regex: `^${escapeRegex(subject)}$`, $options: 'i' }
  if (mode && mode !== 'either') filter.mode = { $in: [mode, 'either'] }
  if (level) filter.level = level
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ title: pattern }, { description: pattern }, { subject: pattern }]
  }

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100).populate('student', 'name')
  res.json({ jobs: await withCounts(jobs) })
})

router.get('/mine', protect, requireRole('student'), async (req, res) => {
  const jobs = await Job.find({ student: req.user.id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'assignedTutor',
      select: 'headline bio subjects education profilePictureUrl verificationStatus user',
      populate: { path: 'user', select: 'name email' }
    })
  res.json({ jobs: await withCounts(jobs) })
})

// For teachers: list student requests assigned to this educator by company
router.get('/assigned-to-me', protect, requireRole('tutor'), async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) return res.json({ jobs: [] })
  const jobs = await Job.find({ assignedTutor: tutor._id })
    .sort({ createdAt: -1 })
    .populate('student', 'name email')
  res.json({ jobs })
})

// The owner sees every proposal; a tutor sees only their own
router.get('/:id', optionalAuth, async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('student', 'name createdAt')
    .populate({
      path: 'assignedTutor',
      select: 'headline bio subjects education profilePictureUrl verificationStatus user',
      populate: { path: 'user', select: 'name email' }
    })
  if (!job) throw httpError(404, 'Job not found')

  const isOwner = req.user && String(job.student._id) === req.user.id
  const response = { job: (await withCounts([job]))[0], isOwner }

  if (isOwner) {
    const proposals = await Proposal.find({ job: job._id, status: { $ne: 'withdrawn' } })
      .sort({ createdAt: -1 })
      .populate({ path: 'tutor', populate: { path: 'user', select: 'name' } })
    const tutorsWithStats = await withTutorStats(proposals.map(p => p.tutor))
    response.proposals = proposals.map((proposal, i) => ({ ...proposal.toObject(), tutor: tutorsWithStats[i] }))
  } else if (req.user?.role === 'tutor') {
    const tutor = await Tutor.findOne({ user: req.user.id })
    response.myProposal = tutor ? await Proposal.findOne({ job: job._id, tutor: tutor._id }) : null
    response.hasProfile = Boolean(tutor)
  }

  res.json(response)
})

router.put('/:id/close', protect, requireRole('student'), async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, student: req.user.id })
  if (!job) throw httpError(404, 'Job not found')
  if (job.status !== 'open') throw httpError(400, 'This job is already closed')

  job.status = 'closed'
  await job.save()
  await Proposal.updateMany({ job: job._id, status: 'submitted' }, { status: 'declined' })
  res.json({ message: 'Job closed', job })
})

router.post('/:id/proposals', protect, requireRole('tutor'), requireVerified, async (req, res) => {
  const { coverLetter, rate } = req.body

  const job = await Job.findById(req.params.id)
  if (!job) throw httpError(404, 'Job not found')
  if (job.status !== 'open') throw httpError(400, 'This job is no longer accepting proposals')

  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) throw httpError(400, 'Create your tutor profile before sending proposals')
  if (tutor.verificationStatus !== 'approved') throw httpError(403, 'Your tutor application must be approved before sending proposals')

  const existing = await Proposal.findOne({ job: job._id, tutor: tutor._id })
  if (existing && existing.status !== 'withdrawn') throw httpError(400, 'You already sent a proposal for this job')
  if (!coverLetter || !String(coverLetter).trim()) throw httpError(400, 'Write a cover letter')

  // A withdrawn proposal can be resubmitted
  const proposal = existing || new Proposal({ job: job._id, tutor: tutor._id })
  proposal.set({ coverLetter, rate: Number(rate), status: 'submitted', createdAt: new Date() })
  await proposal.save()

  await notify(job.student, 'proposal_received', `New proposal on "${job.title}"`, `/jobs/${job._id}`)
  res.status(201).json({ message: 'Proposal sent', proposal })
})

module.exports = router
