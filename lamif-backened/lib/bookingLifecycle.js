// Which side of a booking may move it from one status to another.
// 'reviewed' is not listed: only posting a review (routes/review.js) sets it.
const TRANSITIONS = {
  requested: { accepted: 'tutor', rejected: 'tutor', cancelled: 'student' },
  accepted: { paid: 'tutor', cancelled: 'either' },
  paid: { in_progress: 'tutor', cancelled: 'tutor' },
  in_progress: { completed: 'either' }
}
TRANSITIONS.pending = TRANSITIONS.requested

// Bookings that occupy the tutor's calendar
const ACTIVE_STATUSES = ['accepted', 'paid', 'in_progress']
const FINISHED_STATUSES = ['completed', 'reviewed']

const allowedActor = (from, to) => TRANSITIONS[from]?.[to]

// side is 'student' or 'tutor'
const canTransition = (from, to, side) => {
  const actor = allowedActor(from, to)
  return actor === 'either' || actor === side
}

// The statuses this side can move the booking to next, for rendering action buttons
const nextStatuses = (from, side) =>
  Object.keys(TRANSITIONS[from] || {}).filter(to => canTransition(from, to, side))

module.exports = { TRANSITIONS, ACTIVE_STATUSES, FINISHED_STATUSES, canTransition, nextStatuses }
