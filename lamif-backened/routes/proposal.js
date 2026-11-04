const express = require('express')
const router = express.Router()
const Proposal = require('../models/Proposal')
const Tutor = require('../models/Tutor')
const Job = require('../models/Job')
const protect = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const requireVerified = require('../middleware/requireVerified')
const httpError = require('../lib/httpError')
const notify = require('../lib/notify')
const createBooking = require('../lib/createBooking')

router.get('/mine', protect, requireRole('tutor'), async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  if (!tutor) return res.json({ proposals: [] })

  const proposals = await Proposal.find({ tutor: tutor._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'job', populate: { path: 'student', select: 'name' } })
  res.json({ proposals })
})

router.put('/:id/withdraw', protect, requireRole('tutor'), async (req, res) => {
  const tutor = await Tutor.findOne({ user: req.user.id })
  const proposal = tutor && await Proposal.findOne({ _id: req.params.id, tutor: tutor._id })
  if (!proposal) throw httpError(404, 'Proposal not found')
  if (proposal.status !== 'submitted') throw httpError(400, 'Only pending proposals can be withdrawn')

  proposal.status = 'withdrawn'
  await proposal.save()
  res.json({ message: 'Proposal withdrawn', proposal })
})

// Loads a proposal and checks the logged-in student owns its job
async function ownedProposal(req) {
  const proposal = await Proposal.findById(req.params.id).populate('job').populate('tutor')
  if (!proposal || String(proposal.job.student) !== req.user.id) throw httpError(404, 'Proposal not found')
  if (proposal.status !== 'submitted') throw httpError(400, `This proposal is already ${proposal.status}`)
  return proposal
}

router.put('/:id/decline', protect, requireRole('student'), async (req, res) => {
  const proposal = await ownedProposal(req)
  proposal.status = 'declined'
  await proposal.save()
  await notify(proposal.tutor.user, 'proposal_declined', `Your proposal for "${proposal.job.title}" was declined`, `/jobs/${proposal.job._id}`)
  res.json({ message: 'Proposal declined', proposal })
})

// Hiring turns the proposal into an accepted booking at the proposal's rate
router.post('/:id/hire', protect, requireRole('student'), requireVerified, async (req, res) => {
  const proposal = await ownedProposal(req)
  const { job, tutor } = proposal
  if (job.status !== 'open') throw httpError(400, 'This job is no longer open')
  if (tutor.verificationStatus !== 'approved') throw httpError(403, 'Tutor must be approved before being hired')

  const mode = req.body.mode || (job.mode === 'either' ? tutor.teachingModes[0] : job.mode)
  const booking = await createBooking({
    studentId: req.user.id,
    tutor,
    subject: job.subject,
    message: req.body.message || job.title,
    mode,
    startUtc: req.body.startUtc,
    endUtc: req.body.endUtc,
    hourlyRate: proposal.rate,
    jobId: job._id,
    status: 'accepted'
  })

  proposal.status = 'accepted'
  proposal.booking = booking._id
  await proposal.save()
  await Job.updateOne({ _id: job._id }, { status: 'hired' })

  const others = await Proposal.find({ job: job._id, status: 'submitted' }).populate('tutor', 'user')
  await Proposal.updateMany({ _id: { $in: others.map(p => p._id) } }, { status: 'declined' })
  await Promise.all(others.map(p => notify(p.tutor.user, 'proposal_declined', `"${job.title}" was filled by another tutor`, `/jobs/${job._id}`)))

  res.status(201).json({ message: 'Tutor hired', booking })
})

module.exports = router
