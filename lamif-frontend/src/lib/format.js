export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const formatMoney = amount =>
  `${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB`

export const formatDateTime = date =>
  new Date(date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export const formatDate = date =>
  new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export const formatTime = date =>
  new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export function timeAgo(date) {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, size] = units.find(([, s]) => seconds >= s)
  const n = Math.floor(seconds / size)
  return `${n} ${unit}${n > 1 ? 's' : ''} ago`
}

const STATUS_LABELS = {
  in_progress: 'In progress',
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  needs_changes: 'Needs Changes',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending Review'
}
export const statusLabel = status =>
  STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1)

const MODE_LABELS = { online: 'Online', in_person: 'In person', either: 'Online or in person' }
export const modeLabel = mode => MODE_LABELS[mode] || mode

export const LEVELS = [
  'kg',
  'primary_lower',
  'primary_upper',
  'primary',
  'secondary',
  'preparatory',
  'test_prep',
  'tech_skills',
  'university',
  'professional',
  'other'
]

const LEVEL_LABELS = {
  kg: 'KG 1–3 (Kindergarten)',
  primary_lower: 'Lower Primary (Grade 1–4)',
  primary_upper: 'Upper Primary (Grade 5–8)',
  primary: 'Primary (Grade 1–8)',
  secondary: 'Secondary (Grade 9–10)',
  preparatory: 'Preparatory & Matric (Grade 11–12)',
  test_prep: 'IELTS, SAT & Scholarships',
  tech_skills: 'Computer Basics & Programming',
  university: 'University / College',
  professional: 'Professional Certifications',
  other: 'Other'
}

export const levelLabel = level =>
  LEVEL_LABELS[level] || (level ? level.charAt(0).toUpperCase() + level.slice(1) : '')

export const AVAILABILITY_LABELS = {
  available_now: 'Available now',
  available: 'Available',
  fully_booked: 'Fully booked',
  unavailable: 'Not taking students'
}

export const BADGE_LABELS = {
  verified: 'Verified',
  top_rated: 'Top Rated',
  rising_talent: 'Rising Talent'
}

// Lowest advertised hourly rate, for compact displays
export const startingRate = tutor =>
  Math.min(...[tutor.hourlyRateOnline, tutor.hourlyRateInPerson, tutor.hourlyRate].filter(r => r != null))

export const firstName = name => String(name || '').split(' ')[0]

// Booking action button labels, keyed by target status
export const ACTION_LABELS = {
  accepted: 'Accept',
  rejected: 'Decline',
  cancelled: 'Cancel',
  paid: 'Confirm payment',
  in_progress: 'Start session',
  completed: 'Mark completed'
}

export const budgetText = job => {
  if (job.budgetMin != null && job.budgetMax != null) return `${formatMoney(job.budgetMin)} – ${formatMoney(job.budgetMax)}/hr`
  if (job.budgetMax != null) return `Up to ${formatMoney(job.budgetMax)}/hr`
  if (job.budgetMin != null) return `From ${formatMoney(job.budgetMin)}/hr`
  return 'Budget open'
}
