const Booking = require('../models/Booking')
const httpError = require('./httpError')
const notify = require('./notify')
const { ACTIVE_STATUSES } = require('./bookingLifecycle')

const MAX_SESSION_HOURS = 8

// Requests may overlap (the tutor picks one), but confirmed sessions may not
async function assertTutorFree(tutorId, start, end, ignoreBookingId) {
  const clash = await Booking.exists({
    _id: { $ne: ignoreBookingId },
    tutor: tutorId,
    status: { $in: ACTIVE_STATUSES },
    startUtc: { $lt: end },
    endUtc: { $gt: start }
  })
  if (clash) throw httpError(409, 'The tutor already has a confirmed session at that time')
}

// Shared by direct hires and hires from a job proposal.
// `hourlyRate` is the agreed rate; it and the total price are frozen on the booking.
async function createBooking({ studentId, tutor, subject, message, mode, startUtc, endUtc, hourlyRate, jobId, status = 'requested' }) {
  if (!tutor.isAvailable) throw httpError(400, 'This tutor is not taking new students right now')
  if (!tutor.teachingModes.includes(mode)) throw httpError(400, `This tutor does not offer ${mode.replace('_', '-')} sessions`)
  if (String(tutor.user._id || tutor.user) === String(studentId)) throw httpError(400, 'You cannot book yourself')
  if (!subject || !String(subject).trim()) throw httpError(400, 'Subject is required')

  const start = new Date(startUtc)
  const end = new Date(endUtc)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw httpError(400, 'Choose a start and end time')
  if (start <= new Date()) throw httpError(400, 'The session must start in the future')
  const hours = (end - start) / 3600000
  if (hours <= 0) throw httpError(400, 'The session must end after it starts')
  if (hours > MAX_SESSION_HOURS) throw httpError(400, `Sessions can be at most ${MAX_SESSION_HOURS} hours`)

  await assertTutorFree(tutor._id, start, end)

  const rate = hourlyRate ?? tutor.rateFor(mode)
  if (rate == null) throw httpError(400, 'This tutor has no rate set for that mode')

  const booking = await Booking.create({
    student: studentId,
    tutor: tutor._id,
    subject: String(subject).trim(),
    message: message || '',
    mode,
    startUtc: start,
    endUtc: end,
    hourlyRate: rate,
    price: Math.round(rate * hours * 100) / 100,
    status,
    job: jobId,
    statusHistory: [{ status, by: studentId }]
  })

  await notify(
    tutor.user._id || tutor.user,
    'booking_requested',
    status === 'accepted' ? `You were hired for ${booking.subject}` : `New booking request for ${booking.subject}`,
    '/dashboard'
  )

  return booking
}

module.exports = createBooking
module.exports.assertTutorFree = assertTutorFree
