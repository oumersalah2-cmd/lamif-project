import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage, isUnverifiedError } from '../lib/api'
import { getUser } from '../lib/session'
import { LEVELS, levelLabel } from '../lib/format'
import { ALL_CURRICULUM_SUBJECTS } from '../lib/curriculum'
import Icon from '../components/Icon'

function PostJob() {
  const navigate = useNavigate()
  const user = getUser()
  const [form, setForm] = useState({
    title: '',
    studentName: '',
    phoneNumber: '',
    subject: '',
    level: 'secondary',
    mode: 'in_person',
    preferredSchedule: '',
    preferredGender: 'any',
    budgetMin: '',
    budgetMax: '',
    location: '',
    description: '',
    status: 'under_review'
  })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(user && user.emailVerified === false)
  const [saving, setSaving] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      title: form.title.trim() || `${form.studentName ? `${form.studentName} - ` : ''}${form.subject} Tutoring (${levelLabel(form.level)})`,
      status: 'under_review'
    }

    try {
      const res = await api.post('/jobs', payload)
      navigate(`/jobs/${res.data.job._id}`)
    } catch (err) {
      if (isUnverifiedError(err)) {
        setUnverified(true)
        setError('Please verify your email address to submit a tutoring request.')
      } else {
        setError(errorMessage(err))
      }
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: '820px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <span className="hero-pill" style={{ display: 'inline-flex', marginBottom: '8px', padding: '4px 10px', fontSize: '0.8rem' }}>
            <Icon name="sparkles" size={14} style={{ marginRight: '6px', color: '#10b981' }} />
            Personalized Teacher Matching
          </span>
          <h1 style={{ margin: '4px 0 8px', fontSize: '2.1rem' }}>Request a Verified Educator</h1>
          <p className="muted" style={{ fontSize: '1.02rem', maxWidth: '640px', lineHeight: 1.5 }}>
            Tell us your student's learning goals. Our educational coordinators at LAMIF will review your request and assign the best verified teacher based on subject expertise, grade level, and location.
          </p>
        </div>
      </div>

      <form className="glass-card card" onSubmit={handleSubmit} style={{ padding: '32px' }}>
        {/* Step 1: Student & Grade Info */}
        <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>1. Student & Academic Level</span>
        </h3>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-student">Student / Child's Name *</label>
            <input
              id="j-student"
              placeholder="e.g. Nahom Bekele (or Student Name)"
              value={form.studentName}
              onChange={e => update('studentName', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="j-phone">Family / Contact Phone Number *</label>
            <input
              id="j-phone"
              type="tel"
              placeholder="e.g. 0912 345 678"
              value={form.phoneNumber}
              onChange={e => update('phoneNumber', e.target.value)}
              required
            />
            <span className="hint">We will call or message you to confirm your assigned teacher.</span>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-subject">Subject Needed *</label>
            <input
              id="j-subject"
              list="subject-suggestions"
              placeholder="e.g. Mathematics, Physics, Chemistry, IELTS, SAT, English..."
              value={form.subject}
              onChange={e => update('subject', e.target.value)}
              required
            />
            <datalist id="subject-suggestions">
              {ALL_CURRICULUM_SUBJECTS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="j-level">Grade Level *</label>
            <select id="j-level" value={form.level} onChange={e => update('level', e.target.value)}>
              {LEVELS.map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}
            </select>
          </div>
        </div>

        {/* Step 2: Learning Format & Location */}
        <h3 style={{ margin: '28px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>2. Learning Preferences & Location</span>
        </h3>

        <div className="field">
          <span className="field-label">Instruction Format *</span>
          <div className="row" style={{ gap: '10px' }}>
            {[
              ['in_person', '🏠 In-Person (Home Tutoring)'],
              ['online', '💻 Online (1-on-1 Virtual Class)'],
              ['either', '✨ Either (Home or Online)']
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`chip ${form.mode === value ? 'selected' : ''}`}
                style={{ padding: '8px 16px', fontSize: '0.92rem' }}
                onClick={() => update('mode', value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-location">Location / Area {form.mode !== 'online' ? '*' : '(Optional)'}</label>
            <input
              id="j-location"
              placeholder="e.g. Addis Ababa - Bole, CMC, Sarbet, Hawassa, Adama..."
              value={form.location}
              onChange={e => update('location', e.target.value)}
              required={form.mode !== 'online'}
            />
          </div>
          <div className="field">
            <label htmlFor="j-schedule">Preferred Days & Times</label>
            <input
              id="j-schedule"
              placeholder="e.g. 3 days/week after 4:30 PM, or Weekends"
              value={form.preferredSchedule}
              onChange={e => update('preferredSchedule', e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="j-gender">Preferred Educator Gender</label>
            <select id="j-gender" value={form.preferredGender} onChange={e => update('preferredGender', e.target.value)}>
              <option value="any">No preference (Any qualified educator)</option>
              <option value="female">Female educator preferred</option>
              <option value="male">Male educator preferred</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="j-budget">Estimated Budget in ETB (Optional)</label>
            <div className="row" style={{ gap: '8px', flexWrap: 'nowrap' }}>
              <input
                id="j-budget"
                type="number"
                min="0"
                placeholder="Min (ETB/hr)"
                value={form.budgetMin}
                onChange={e => update('budgetMin', e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Max (ETB/hr)"
                value={form.budgetMax}
                onChange={e => update('budgetMax', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Goals & Specifics */}
        <h3 style={{ margin: '28px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>3. Student Goals & Learning Needs</span>
        </h3>

        <div className="field">
          <label htmlFor="j-desc">Describe what the student needs help with *</label>
          <textarea
            id="j-desc"
            rows="5"
            placeholder="Share specific topics, current challenges, upcoming exams (e.g. Grade 12 ESSLCE, IELTS), or any teaching style that works best for your child..."
            value={form.description}
            onChange={e => update('description', e.target.value)}
            required
          />
        </div>

        {(error || unverified) && (
          <div className="error-text" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', margin: '16px 0' }}>
            {unverified ? (
              <span>
                Please verify your email address before submitting a request.{' '}
                <Link to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                  Verify your email
                </Link>
              </span>
            ) : (
              error
            )}
          </div>
        )}

        <div className="row-between" style={{ marginTop: '24px', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-primary btn-lg" disabled={saving}>
            {saving ? 'Submitting Request...' : 'Submit Tutoring Request'} <Icon name="arrowRight" size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostJob
