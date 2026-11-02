import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage, isUnverifiedError } from '../lib/api'
import { getUser } from '../lib/session'
import { DAYS, firstName, formatMoney, modeLabel } from '../lib/format'

const DURATIONS = [1, 1.5, 2, 3]

const tomorrow = () => {
  const d = new Date(Date.now() + 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Books a tutor directly, or (with `proposal`) hires them from a job proposal at the proposal's rate
function HireModal({ tutor, proposal, job, onClose, onDone }) {
  const user = getUser()
  const modes = job && job.mode !== 'either' ? [job.mode] : tutor.teachingModes
  const [form, setForm] = useState({
    subject: job?.subject || tutor.subjects[0] || '',
    mode: modes[0],
    date: tomorrow(),
    time: '17:00',
    hours: 1,
    message: ''
  })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(user && user.emailVerified === false)
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const rate = proposal ? proposal.rate : (form.mode === 'in_person' ? tutor.hourlyRateInPerson : tutor.hourlyRateOnline)
  const start = new Date(`${form.date}T${form.time}`)
  const daySlots = (tutor.availability || []).filter(slot => slot.day === start.getDay())

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const end = new Date(start.getTime() + form.hours * 3600000)
    try {
      if (proposal) {
        await api.post(`/proposals/${proposal._id}/hire`, { mode: form.mode, startUtc: start, endUtc: end, message: form.message })
      } else {
        await api.post('/booking/hire', { tutorId: tutor._id, subject: form.subject, mode: form.mode, startUtc: start, endUtc: end, message: form.message })
      }
      onDone()
    } catch (err) {
      if (isUnverifiedError(err)) {
        setUnverified(true)
        setError('Please verify your email address to book a session.')
      } else {
        setError(errorMessage(err, 'Could not send the request'))
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <h3>{proposal ? `Hire ${firstName(tutor.user?.name)}` : `Book a session with ${firstName(tutor.user?.name)}`}</h3>
        <form onSubmit={handleSubmit}>
          {!job && (
            <div className="field">
              <label htmlFor="hire-subject">Subject</label>
              <select id="hire-subject" value={form.subject} onChange={e => update('subject', e.target.value)}>
                {tutor.subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {modes.length > 1 && (
            <div className="field">
              <span className="field-label">Session type</span>
              <div className="row">
                {modes.map(mode => (
                  <button type="button" key={mode} className={`chip ${form.mode === mode ? 'selected' : ''}`} onClick={() => update('mode', mode)}>
                    {modeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="hire-date">Date</label>
              <input id="hire-date" type="date" min={tomorrow()} value={form.date} onChange={e => update('date', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="hire-time">Start time</label>
              <input id="hire-time" type="time" value={form.time} onChange={e => update('time', e.target.value)} required />
            </div>
          </div>
          <p className="hint small muted" style={{ marginTop: '-8px' }}>
            {daySlots.length > 0
              ? `${firstName(tutor.user?.name)} usually teaches ${DAYS[start.getDay()]} ${daySlots.map(s => `${s.start}–${s.end}`).join(', ')} (Addis Ababa time)`
              : `${firstName(tutor.user?.name)} has no regular hours on ${DAYS[start.getDay()] || 'that day'}. You can still ask.`}
          </p>

          <div className="field">
            <span className="field-label">Duration</span>
            <div className="row">
              {DURATIONS.map(h => (
                <button type="button" key={h} className={`chip ${form.hours === h ? 'selected' : ''}`} onClick={() => update('hours', h)}>
                  {h} hr{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="hire-message">Message</label>
            <textarea id="hire-message" rows="3" placeholder="What would you like to work on?" value={form.message} onChange={e => update('message', e.target.value)} />
          </div>

          <div className="price-preview">
            <div className="row-between">
              <span>{formatMoney(rate)}/hr × {form.hours} hr{form.hours > 1 ? 's' : ''}</span>
              <strong style={{ fontSize: '1.2rem' }}>{formatMoney(rate * form.hours)}</strong>
            </div>
            <p className="small muted" style={{ margin: '6px 0 0' }}>This price is locked for this session, even if the tutor changes their rates later.</p>
          </div>

          {error && (
            <div className="error-text" style={{ margin: '12px 0', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>
              {unverified ? (
                <span>
                  Please verify your email address to book a session.{' '}
                  <Link to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                    Verify your email
                  </Link>
                </span>
              ) : (
                error
              )}
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button type="submit" className="btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Sending...' : proposal ? 'Hire & schedule' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HireModal
