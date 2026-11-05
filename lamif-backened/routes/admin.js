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
const { sendMail } = require('../lib/mailer')
const { FINISHED_STATUSES } = require('../lib/bookingLifecycle')
const { getPrimaryClientUrl } = require('../lib/corsConfig')

router.use(protect, requireRole('admin'))

router.get('/stats', async (req, res) => {
  const [students, tutors, pendingTutors, openJobs, bookingsByStatus, volume] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Tutor.countDocuments(),
    Tutor.countDocuments({ verificationStatus: { $in: ['submitted', 'pending', 'under_review'] } }),
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
  const filter = (req.query.status && req.query.status !== 'all') ? { verificationStatus: req.query.status } : {}
  const tutors = await Tutor.find(filter)
    .sort({ submittedAt: -1, createdAt: -1 })
    .populate('user', 'name email')
  res.json({ tutors })
})

router.get('/tutors/:id', async (req, res) => {
  const tutor = await Tutor.findById(req.params.id)
    .populate('user', 'name email createdAt')
    .populate('adminFeedback.reviewedBy', 'name')
  if (!tutor) throw httpError(404, 'Tutor not found')
  res.json({ tutor })
})

router.put('/tutors/:id/verification', async (req, res) => {
  const { status, note, reason } = req.body
  const validStatuses = ['approved', 'rejected', 'needs_changes', 'under_review', 'pending']
  if (!validStatuses.includes(status)) throw httpError(400, 'Invalid verification status')

  const tutor = await Tutor.findById(req.params.id).populate('user', 'name email')
  if (!tutor) throw httpError(404, 'Tutor not found')

  if (tutor.verificationStatus === 'draft') throw httpError(400, 'This application has not been submitted yet')

  if (status === 'needs_changes' && (!note || !note.trim())) {
    throw httpError(400, 'Please provide a note specifying what changes are needed.')
  }
  if (status === 'rejected' && (!reason || !reason.trim())) {
    throw httpError(400, 'Please provide a reason for rejection.')
  }

  tutor.verificationStatus = status
  tutor.adminFeedback = {
    note: (note || '').trim(),
    rejectionReason: (reason || '').trim(),
    reviewedBy: req.user.id,
    reviewedAt: new Date()
  }

  if (status === 'rejected') {
    // 14 days cooldown before they can reapply
    tutor.reapplyAllowedAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  }

  await tutor.save()

  // In-app notification
  const messages = {
    approved: 'Congratulations! Your tutor application has been approved. Your profile is now live on LAMIF.',
    needs_changes: `Action required: The admin team requested changes to your application: "${(note || '').trim()}"`,
    rejected: `Your tutor application was not approved: "${(reason || '').trim()}". You may reapply after the review cooldown.`,
    under_review: 'Your tutor application is currently under review by our admin team.',
    pending: 'Your tutor application is in the queue for review.'
  }
  await notify(tutor.user._id, 'application_status', messages[status], '/profile/edit')

  // Send email notification
  try {
    const clientUrl = getPrimaryClientUrl()
    const emailSubjects = {
      approved: 'Congratulations! Your LAMIF Tutor Application is Approved',
      needs_changes: 'Action Required: Changes Needed on Your LAMIF Tutor Application',
      rejected: 'Update Regarding Your LAMIF Tutor Application',
      under_review: 'Your LAMIF Tutor Application is Under Review',
      pending: 'Your LAMIF Tutor Application is Queued for Review'
    }

    const emailTexts = {
      approved: `Hello ${tutor.user.name},\n\nGreat news! Your tutor application on LAMIF has been approved by our admin team.\n\nYour profile is now verified and active. Students can discover your profile, book sessions with you, and you can submit proposals on tutoring jobs.\n\nVisit your dashboard to view your profile:\n${clientUrl}/dashboard\n\nBest regards,\nThe LAMIF Team`,
      needs_changes: `Hello ${tutor.user.name},\n\nOur admin team has reviewed your tutor application and requested the following updates before approval:\n\n"${(note || '').trim()}"\n\nPlease log in, update your application, and resubmit:\n${clientUrl}/profile/edit\n\nBest regards,\nThe LAMIF Team`,
      rejected: `Hello ${tutor.user.name},\n\nThank you for applying to tutor with LAMIF. After review, we are unable to approve your application at this time.\n\nReason: "${(reason || '').trim()}"\n\nYou will be eligible to reapply on ${tutor.reapplyAllowedAt ? tutor.reapplyAllowedAt.toLocaleDateString() : 'a later date'}.\n\nBest regards,\nThe LAMIF Team`,
      under_review: `Hello ${tutor.user.name},\n\nYour tutor application is currently being reviewed by our admin team. We will notify you once a decision is made.\n\nBest regards,\nThe LAMIF Team`,
      pending: `Hello ${tutor.user.name},\n\nYour tutor application has been received and is queued for admin review.\n\nBest regards,\nThe LAMIF Team`
    }

    if (tutor.user.email) {
      await sendMail({
        to: tutor.user.email,
        subject: emailSubjects[status] || 'Update on your LAMIF Tutor Application',
        text: emailTexts[status] || messages[status]
      })
    }
  } catch (emailErr) {
    console.warn('[ADMIN VERIFICATION EMAIL ERROR]', emailErr.message)
  }

  res.json({ message: 'Verification updated successfully', tutor })
})

module.exports = router
