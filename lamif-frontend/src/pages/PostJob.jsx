import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage, isUnverifiedError } from '../lib/api'
import { getUser } from '../lib/session'
import { LEVELS, levelLabel } from '../lib/format'
import { ALL_CURRICULUM_SUBJECTS } from '../lib/curriculum'

function PostJob() {
  const navigate = useNavigate()
  const user = getUser()
  const [form, setForm] = useState({ title: '', subject: '', level: 'secondary', mode: 'either', budgetMin: '', budgetMax: '', location: '', description: '' })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(user && user.emailVerified === false)
  const [saving, setSaving] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/jobs', form)
      navigate(`/jobs/${res.data.job._id}`)
    } catch (err) {
      if (isUnverifiedError(err)) {
        setUnverified(true)
        setError('Please verify your email address to post a job.')
      } else {
        setError(errorMessage(err))
      }
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: '760px' }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">New job post</p>
          <h1>Tell tutors what you need</h1>
        </div>
      </div>
      <form className="glass-card card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="j-title">Title</label>
          <input id="j-title" maxLength={120} placeholder="e.g. Grade 12 chemistry tutor for national exam" value={form.title} onChange={e => update('title', e.target.value)} required />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-subject">Subject</label>
            <input
              id="j-subject"
              list="subject-suggestions"
              placeholder="e.g. Mathematics, IELTS, SAT, Computer Basics, Python"
              value={form.subject}
              onChange={e => update('subject', e.target.value)}
              required
            />
            <datalist id="subject-suggestions">
              {ALL_CURRICULUM_SUBJECTS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="j-level">Level</label>
            <select id="j-level" value={form.level} onChange={e => update('level', e.target.value)}>
              {LEVELS.map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <span className="field-label">Session type</span>
          <div className="row">
            {[['either', 'Either'], ['online', 'Online'], ['in_person', 'In person']].map(([value, label]) => (
              <button type="button" key={value} className={`chip ${form.mode === value ? 'selected' : ''}`} onClick={() => update('mode', value)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-min">Min budget (ETB/hr)</label>
            <input id="j-min" type="number" min="0" value={form.budgetMin} onChange={e => update('budgetMin', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="j-max">Max budget (ETB/hr)</label>
            <input id="j-max" type="number" min="0" value={form.budgetMax} onChange={e => update('budgetMax', e.target.value)} />
          </div>
          {form.mode !== 'online' && (
            <div className="field">
              <label htmlFor="j-location">Location</label>
              <input id="j-location" placeholder="City or area" value={form.location} onChange={e => update('location', e.target.value)} />
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="j-desc">Description</label>
          <textarea id="j-desc" rows="7" placeholder="Topics, goals, how often you want sessions, preferred times..." value={form.description} onChange={e => update('description', e.target.value)} required />
        </div>
        {(error || unverified) && (
          <div className="error-text" style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', margin: '14px 0' }}>
            {unverified ? (
              <span>
                Please verify your email address before posting a job.{' '}
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
          <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={saving}>{saving ? 'Posting...' : 'Post job'}</button>
        </div>
      </form>
    </div>
  )
}

export default PostJob
