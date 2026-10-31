const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Tutor = require('../models/Tutor')
const Booking = require('../models/Booking')
const Job = require('../models/Job')
const protect = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const httpError = require('../lib/httpError')
const notify = require('../lib/notify')
const { FINISHED_STATUSES } = require('../lib/bookingLifecycle')

router.use(protect, requireRole('admin'))

router.get('/stats', async (req, res) => {
  const [students, tutors, pendingTutors, openJobs, bookingsByStatus, volume] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Tutor.countDocuments(),
    Tutor.countDocuments({ verificationStatus: 'pending' }),
    Job.countDocuments({ status: 'open' }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { status: { $in: FINISHED_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ])
  ])
  res.json({
    students,
    tutors,
    pendingTutors,
    openJobs,
    bookingsByStatus: Object.fromEntries(bookingsByStatus.map(r => [r._id, r.count])),
    completedVolume: volume[0]?.total || 0
  })
})

router.get('/tutors', async (req, res) => {
  const filter = req.query.status ? { verificationStatus: req.query.status } : {}
  const tutors = await Tutor.find(filter).sort({ createdAt: -1 }).populate('user', 'name email')
  res.json({ tutors })
})

router.put('/tutors/:id/verification', async (req, res) => {
  const { status } = req.body
  if (!['approved', 'rejected', 'pending'].includes(status)) throw httpError(400, 'Invalid verification status')

  const tutor = await Tutor.findByIdAndUpdate(req.params.id, { verificationStatus: status }, { returnDocument: 'after' })
  if (!tutor) throw httpError(404, 'Tutor not found')

  const messages = {
    approved: 'Your tutor profile is verified! You now show a Verified badge.',
    rejected: 'Your tutor profile was not approved. Update it and contact support.',
    pending: 'Your tutor profile is back under review.'
  }
  await notify(tutor.user, 'verification', messages[status], '/profile/edit')
  res.json({ message: 'Verification updated', tutor })
})

module.exports = router
