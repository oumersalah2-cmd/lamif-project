import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import api, { errorMessage, fileUrl } from '../lib/api'
import { getUser } from '../lib/session'
import { DAYS, statusLabel } from '../lib/format'

const EMPTY_FORM = {
  headline: '',
  bio: '',
  subjects: '',
  education: '',
  languages: '',
  location: '',
  teachingModes: ['online'],
  hourlyRateOnline: '',
  hourlyRateInPerson: '',
  maxActiveStudents: 5,
  isAvailable: true,
  availability: []
}

const VERIFICATION_NOTES = {
  pending: 'Your profile is under review. You can still receive bookings while you wait.',
  approved: 'Your profile is verified and shows a Verified badge.',
  rejected: 'Your profile was not approved and is hidden from search. Update it and contact support.'
}

function ProfileEditor() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cvFile, setCvFile] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [message, setMessage] = useState({ text: '', ok: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/tutor/me')
      .then(({ data: { tutor } }) => {
        setExisting(tutor)
        setForm({
          headline: tutor.headline || '',
          bio: tutor.bio,
          subjects: tutor.subjects.join(', '),
          education: tutor.education,
          languages: tutor.languages.join(', '),
          location: tutor.location || '',
          teachingModes: tutor.teachingModes,
          hourlyRateOnline: tutor.hourlyRateOnline ?? '',
          hourlyRateInPerson: tutor.hourlyRateInPerson ?? '',
          maxActiveStudents: tutor.maxActiveStudents,
          isAvailable: tutor.isAvailable,
          availability: tutor.availability
        })
      })
      .catch(() => {}) // 404: no profile yet, start from the empty form
      .finally(() => setLoading(false))
  }, [])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleMode = mode => {
    const modes = form.teachingModes.includes(mode)
      ? form.teachingModes.filter(m => m !== mode)
      : [...form.teachingModes, mode]
    if (modes.length > 0) update('teachingModes', modes)
  }

  const updateSlot = (index, field, value) =>
    update('availability', form.availability.map((slot, i) => (i === index ? { ...slot, [field]: field === 'day' ? Number(value) : value } : slot)))

  const addSlot = () => update('availability', [...form.availability, { day: 1, start: '17:00', end: '20:00' }])
  const removeSlot = index => update('availability', form.availability.filter((_, i) => i !== index))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', ok: false })

    const data = new FormData()
    for (const field of ['headline', 'bio', 'subjects', 'education', 'languages', 'location', 'maxActiveStudents', 'isAvailable']) {
      data.append(field, form[field])
    }
    data.append('teachingModes', JSON.stringify(form.teachingModes))
    data.append('availability', JSON.stringify(form.availability))
    if (form.teachingModes.includes('online')) data.append('hourlyRateOnline', form.hourlyRateOnline)
    if (form.teachingModes.includes('in_person')) data.append('hourlyRateInPerson', form.hourlyRateInPerson)
    if (cvFile) data.append('cv', cvFile)
    if (photo) data.append('profilePicture', photo)

    try {
      if (existing) {
        const res = await api.put('/tutor/profile', data)
        setExisting(res.data.tutor)
        setMessage({ text: 'Profile saved. Existing bookings keep the rate they were booked at.', ok: true })
      } else {
        await api.post('/tutor/profile', data)
        navigate('/dashboard')
      }
    } catch (err) {
      setMessage({ text: errorMessage(err), ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><p className="muted">Loading...</p></div>

  return (
    <div className="page" style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">{existing ? 'Your profile' : 'Get started'}</p>
          <h1>{existing ? 'Edit Tutor Profile' : 'Create Your Tutor Profile'}</h1>
        </div>
        {existing && <Link to={`/tutors/${existing._id}`} className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View public profile</Link>}
      </div>

      {existing && (
        <div className="glass-card card row" style={{ marginBottom: '20px' }}>
          <span className={`status-badge status-${existing.verificationStatus}`}>{statusLabel(existing.verificationStatus)}</span>
          <span className="small">{VERIFICATION_NOTES[existing.verificationStatus]}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack">
        <div className="glass-card card">
          <h3>Basics</h3>
          <div className="row" style={{ gap: '16px', marginBottom: '16px' }}>
            {photo
              ? <img className="avatar" src={URL.createObjectURL(photo)} alt="New profile" />
              : <Avatar path={existing?.profilePictureUrl} name={existing?.user?.name || getUser()?.name} />}
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="p-photo">Profile photo (JPG/PNG, max 5MB)</label>
              <input id="p-photo" type="file" accept="image/png,image/jpeg" onChange={e => setPhoto(e.target.files[0])} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-headline">Headline</label>
            <input id="p-headline" maxLength={120} placeholder="e.g. Mathematics & Physics tutor | National exam specialist" value={form.headline} onChange={e => update('headline', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="p-bio">About you</label>
            <textarea id="p-bio" rows="6" placeholder="Your teaching experience, style and what students can expect" value={form.bio} onChange={e => update('bio', e.target.value)} required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-subjects">Subjects</label>
              <input id="p-subjects" placeholder="Mathematics, Physics" value={form.subjects} onChange={e => update('subjects', e.target.value)} required />
              <span className="hint">Separate with commas</span>
            </div>
            <div className="field">
              <label htmlFor="p-languages">Languages</label>
              <input id="p-languages" placeholder="Amharic, English" value={form.languages} onChange={e => update('languages', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-education">Education</label>
              <input id="p-education" placeholder="Highest degree or certification" value={form.education} onChange={e => update('education', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="p-location">City</label>
              <input id="p-location" placeholder="Addis Ababa" value={form.location} onChange={e => update('location', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-cv">CV / certificates (PDF or Word){existing?.cvUrl && <> · <a href={fileUrl(existing.cvUrl)} target="_blank" rel="noreferrer" className="success-text">current file</a></>}</label>
            <input id="p-cv" type="file" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files[0])} />
          </div>
        </div>

        <div className="glass-card card">
          <h3>Rates & teaching</h3>
          <div className="field">
            <span className="field-label">I teach</span>
            <div className="row">
              {[['online', 'Online'], ['in_person', 'In person']].map(([mode, label]) => (
                <button type="button" key={mode} className={`chip ${form.teachingModes.includes(mode) ? 'selected' : ''}`} onClick={() => toggleMode(mode)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            {form.teachingModes.includes('online') && (
              <div className="field">
                <label htmlFor="p-rate-online">Online rate (ETB/hr)</label>
                <input id="p-rate-online" type="number" min="0" value={form.hourlyRateOnline} onChange={e => update('hourlyRateOnline', e.target.value)} required />
              </div>
            )}
            {form.teachingModes.includes('in_person') && (
              <div className="field">
                <label htmlFor="p-rate-inperson">In-person rate (ETB/hr)</label>
                <input id="p-rate-inperson" type="number" min="0" value={form.hourlyRateInPerson} onChange={e => update('hourlyRateInPerson', e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label htmlFor="p-capacity">Max active students</label>
              <input id="p-capacity" type="number" min="1" value={form.maxActiveStudents} onChange={e => update('maxActiveStudents', e.target.value)} required />
              <span className="hint">You show as "Fully booked" when this many sessions are in progress</span>
            </div>
          </div>
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isAvailable} onChange={e => update('isAvailable', e.target.checked)} />
            Taking new students (uncheck to hide from search)
          </label>
        </div>

        <div className="glass-card card">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Weekly availability</h3>
            <button type="button" className="btn-ghost btn-sm" onClick={addSlot}>+ Add time slot</button>
          </div>
          <p className="muted small">In Addis Ababa time. Students see these hours, and you show as "Available now" during them.</p>
          {form.availability.length === 0 && <p className="muted small">No slots yet.</p>}
          {form.availability.map((slot, index) => (
            <div key={index} className="row" style={{ marginBottom: '10px', flexWrap: 'nowrap' }}>
              <select className="input" style={{ width: 'auto' }} value={slot.day} onChange={e => updateSlot(index, 'day', e.target.value)} aria-label="Day">
                {DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
              </select>
              <input className="input" type="time" value={slot.start} onChange={e => updateSlot(index, 'start', e.target.value)} aria-label="Start" />
              <span className="muted">to</span>
              <input className="input" type="time" value={slot.end} onChange={e => updateSlot(index, 'end', e.target.value)} aria-label="End" />
              <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => removeSlot(index)} aria-label="Remove slot"><Icon name="close" size={16} /></button>
            </div>
          ))}
        </div>

        {message.text && <p className={message.ok ? 'success-text' : 'error-text'}>{message.text}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : existing ? 'Save changes' : 'Create profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfileEditor
