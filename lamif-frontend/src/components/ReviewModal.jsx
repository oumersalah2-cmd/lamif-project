import { useState } from 'react'
import { StarInput } from './StarRating'
import api, { errorMessage } from '../lib/api'

function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/reviews', { bookingId: booking._id, rating, comment })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <h3>Rate your {booking.subject} session</h3>
        <p className="muted small">Your review appears publicly in {booking.tutor?.user?.name || 'the tutor'}'s work history.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="field">
            <label htmlFor="review-comment">Feedback</label>
            <textarea id="review-comment" rows="4" placeholder="What went well? What could be better?" value={comment} onChange={e => setComment(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button type="submit" className="btn-primary btn-sm" disabled={submitting}>Submit review</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReviewModal
