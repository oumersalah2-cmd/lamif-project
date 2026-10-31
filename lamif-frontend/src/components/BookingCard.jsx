import { useState } from 'react'
import Icon from './Icon'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../lib/api'
import { conversationPath } from '../lib/messaging'
import { ACTION_LABELS, formatDateTime, formatMoney, formatTime, modeLabel, statusLabel } from '../lib/format'

// Statuses where acting is a "negative" choice, rendered as secondary buttons
const NEGATIVE = ['rejected', 'cancelled']

function BookingCard({ booking, side, onChanged, onReview }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')

  const other = side === 'student' ? booking.tutor?.user : booking.student
  const hours = booking.startUtc && booking.endUtc ? (new Date(booking.endUtc) - new Date(booking.startUtc)) / 3600000 : null

  const changeStatus = async status => {
    if (NEGATIVE.includes(status) && !window.confirm(`${ACTION_LABELS[status]} this booking?`)) return
    setBusy(true)
    setError('')
    try {
      await api.put(`/booking/status/${booking._id}`, { status })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const postReply = async e => {
    e.preventDefault()
    try {
      await api.put(`/reviews/${booking.review._id}/reply`, { reply })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const openChat = async () => navigate(await conversationPath(other._id))

  return (
    <div className="booking-card glass-card">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h4>
            {side === 'student' && booking.tutor
              ? <Link className="link" to={`/tutors/${booking.tutor._id}`}>{other?.name}</Link>
              : other?.name}
          </h4>
          <span className="muted small">{booking.subject} · {modeLabel(booking.mode)}</span>
        </div>
        <span className={`status-badge status-${booking.status}`}>{statusLabel(booking.status === 'pending' ? 'requested' : booking.status)}</span>
      </div>

      {booking.startUtc && (
        <p style={{ margin: 0 }}><Icon name="calendar" size={15} className="muted" /> {formatDateTime(booking.startUtc)} – {formatTime(booking.endUtc)}</p>
      )}
      {booking.price != null && (
        <p style={{ margin: 0 }}>
          <strong>{formatMoney(booking.price)}</strong>
          <span className="muted small"> · {formatMoney(booking.hourlyRate)}/hr{hours ? ` × ${hours} hr${hours === 1 ? '' : 's'}` : ''} (locked)</span>
        </p>
      )}
      {booking.message && <p className="muted small" style={{ margin: 0 }}>"{booking.message}"</p>}
      {booking.status === 'accepted' && side === 'student' && (
        <p className="small" style={{ margin: 0 }}><Icon name="wallet" size={15} className="success-text" /> Pay your tutor, then they confirm payment here to unlock the session.</p>
      )}

      {booking.review && (
        <div className="small">
          <span className="stars">{'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}</span>
          {booking.review.comment && <span className="muted"> "{booking.review.comment}"</span>}
          {booking.review.tutorReply && <div className="reply">Reply: {booking.review.tutorReply}</div>}
          {side === 'tutor' && !booking.review.tutorReply && (
            <form onSubmit={postReply} className="row" style={{ marginTop: '8px', flexWrap: 'nowrap' }}>
              <input className="input" placeholder="Reply publicly to this review" value={reply} onChange={e => setReply(e.target.value)} />
              <button className="btn-ghost btn-sm" disabled={!reply.trim()}>Reply</button>
            </form>
          )}
        </div>
      )}

      {error && <p className="error-text small" style={{ margin: 0 }}>{error}</p>}

      <div className="booking-actions">
        {booking.nextStatuses.filter(s => !NEGATIVE.includes(s)).map(status => (
          <button key={status} className="btn-primary btn-sm" disabled={busy} onClick={() => changeStatus(status)}>{ACTION_LABELS[status]}</button>
        ))}
        {booking.canReview && <button className="btn-primary btn-sm" onClick={() => onReview(booking)}>Leave a review</button>}
        {other && <button className="btn-ghost btn-sm" onClick={openChat}>Message</button>}
        {booking.nextStatuses.filter(s => NEGATIVE.includes(s)).map(status => (
          <button key={status} className="btn-ghost btn-sm btn-danger" disabled={busy} onClick={() => changeStatus(status)}>{ACTION_LABELS[status]}</button>
        ))}
      </div>
    </div>
  )
}

export default BookingCard
