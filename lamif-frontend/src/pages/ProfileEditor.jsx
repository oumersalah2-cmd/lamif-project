import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import api, { API_URL, apiUrl, errorMessage, fileUrl } from '../lib/api'
import { getUser } from '../lib/session'
import { DAYS, formatDate, statusLabel } from '../lib/format'

const QUICK_SUBJECTS = [
  'Mathematics (KG–12)',
  'Physics (Grade 9–12)',
  'Chemistry (Grade 9–12)',
  'Biology (Grade 9–12)',
  'General Science (Grade 1–8)',
  'Grade 12 ESSLCE Prep',
  'KG 1–3 Early Childhood',
  'English Language',
  'Amharic (አማርኛ)',
  'Afaan Oromoo',
  'Arabic (العربية)',
  'IELTS Preparation',
  'SAT & Digital SAT',
  'Scholarship Application Process',
  'Computer Basics (How to Use a Computer)',
  'Computer Programming & Coding',
  'Python Programming',
  'Web Development'
]

const QUICK_LANGUAGES = ['Amharic', 'Afaan Oromo', 'English', 'Arabic', 'Tigrinya', 'French']

const EMPTY_FORM = {
  headline: '',
  bio: '',
  education: '',
  location: '',
  phoneNumber: '',
  idNumber: '',
  experienceYears: '',
  teachingStatement: '',
  subjects: '',
  languages: '',
  teachingModes: ['online'],
  hourlyRateOnline: '',
  hourlyRateInPerson: '',
  maxActiveStudents: 5,
  isAvailable: true,
  availability: [],
  certificates: [],
  agreementAccepted: false
}

function ProfileEditor() {
  const navigate = useNavigate()
  const user = getUser()
  const [form, setForm] = useState(EMPTY_FORM)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cvFile, setCvFile] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [idDocFile, setIdDocFile] = useState(null)
  const [certFiles, setCertFiles] = useState({})
  const [message, setMessage] = useState({ text: '', ok: false })
  const [saving, setSaving] = useState(false)
  const [reapplying, setReapplying] = useState(false)

  const token = localStorage.getItem('token') || ''

  useEffect(() => {
    api.get('/tutor/me')
      .then(({ data: { tutor } }) => {
        setExisting(tutor)
        setForm({
          headline: tutor.headline || '',
          bio: tutor.bio || '',
          education: tutor.education || '',
          location: tutor.location || '',
          phoneNumber: tutor.phoneNumber || '',
          idNumber: tutor.idNumber || '',
          experienceYears: tutor.experienceYears ?? '',
          teachingStatement: tutor.teachingStatement || '',
          subjects: (tutor.subjects || []).join(', '),
          languages: (tutor.languages || []).join(', '),
          teachingModes: tutor.teachingModes || ['online'],
          hourlyRateOnline: tutor.hourlyRateOnline ?? '',
          hourlyRateInPerson: tutor.hourlyRateInPerson ?? '',
          maxActiveStudents: tutor.maxActiveStudents ?? 5,
          isAvailable: tutor.isAvailable ?? true,
          availability: tutor.availability || [],
          certificates: tutor.certificates || [],
          agreementAccepted: tutor.agreementAccepted ?? false
        })
      })
      .catch(() => { }) // 404: no application yet
      .finally(() => setLoading(false))
  }, [])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addSubject = sub => {
    const current = (form.subjects || '').split(',').map(s => s.trim()).filter(Boolean)
    const exists = current.some(s => s.toLowerCase() === sub.toLowerCase())
    if (!exists) {
      update('subjects', [...current, sub].join(', '))
    }
  }

  const addLanguage = lang => {
    const current = (form.languages || '').split(',').map(s => s.trim()).filter(Boolean)
    const exists = current.some(s => s.toLowerCase() === lang.toLowerCase())
    if (!exists) {
      update('languages', [...current, lang].join(', '))
    }
  }

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

  // Certificates management
  const addCertificate = () =>
    update('certificates', [...form.certificates, { name: '', issuer: '', year: new Date().getFullYear(), file: '' }])

  const updateCertificate = (index, field, value) =>
    update('certificates', form.certificates.map((cert, i) => (i === index ? { ...cert, [field]: value } : cert)))

  const removeCertificate = index => {
    update('certificates', form.certificates.filter((_, i) => i !== index))
    setCertFiles(prev => {
      const copy = { ...prev }
      delete copy[index]
      return copy
    })
  }

  const handleReapply = async () => {
    setReapplying(true)
    setMessage({ text: '', ok: false })
    try {
      const res = await api.post('/tutor/reapply')
      setExisting(res.data.tutor)
      setMessage({ text: 'Application reopened as draft. Update any details below and resubmit.', ok: true })
    } catch (err) {
      setMessage({ text: errorMessage(err), ok: false })
    } finally {
      setReapplying(false)
    }
  }

  const saveApplication = async (actionType) => {
    setSaving(true)
    setMessage({ text: '', ok: false })

    const isSubmit = actionType === 'submit'

    if (isSubmit && !form.agreementAccepted) {
      setMessage({ text: 'Please read and check the tutor agreement before submitting your application.', ok: false })
      setSaving(false)
      return
    }

    const data = new FormData()
    data.append('action', actionType)

    for (const field of [
      'headline', 'bio', 'education', 'location', 'phoneNumber', 'idNumber',
      'experienceYears', 'teachingStatement', 'subjects', 'languages',
      'maxActiveStudents', 'isAvailable', 'agreementAccepted'
    ]) {
      data.append(field, form[field])
    }

    data.append('teachingModes', JSON.stringify(form.teachingModes))
    data.append('availability', JSON.stringify(form.availability))
    data.append('certificates', JSON.stringify(form.certificates))

    if (form.teachingModes.includes('online') && form.hourlyRateOnline !== '') {
      data.append('hourlyRateOnline', form.hourlyRateOnline)
    }
    if (form.teachingModes.includes('in_person') && form.hourlyRateInPerson !== '') {
      data.append('hourlyRateInPerson', form.hourlyRateInPerson)
    }

    if (cvFile) data.append('cv', cvFile)
    if (photo) data.append('profilePicture', photo)
    if (idDocFile) data.append('idDocument', idDocFile)

    // Append certificate files
    Object.keys(certFiles).forEach(idx => {
      if (certFiles[idx]) {
        data.append('certificateFiles', certFiles[idx])
      }
    })

    try {
      if (existing) {
        const res = await api.put('/tutor/profile', data)
        setExisting(res.data.tutor)
        setMessage({
          text: isSubmit
            ? 'Application submitted successfully! Our administrative team will review your application.'
            : 'Draft saved. You can continue editing anytime.',
          ok: true
        })
      } else {
        const res = await api.post('/tutor/profile', data)
        setExisting(res.data.tutor)
        setMessage({
          text: isSubmit
            ? 'Application submitted successfully! Our team will review your credentials.'
            : 'Application draft created.',
          ok: true
        })
        if (isSubmit) navigate('/dashboard')
      }
    } catch (err) {
      setMessage({ text: errorMessage(err), ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><p className="muted">Loading application...</p></div>

  const currentStatus = existing?.verificationStatus || 'draft'
  const isApproved = currentStatus === 'approved'
  const isRejected = currentStatus === 'rejected'
  const isNeedsChanges = currentStatus === 'needs_changes'
  const canReapply = isRejected && (!existing?.reapplyAllowedAt || new Date() >= new Date(existing.reapplyAllowedAt))

  return (
    <div className="page" style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">{isApproved ? 'Tutor Profile' : 'Tutor Application'}</p>
          <h1>{isApproved ? 'Edit Tutor Profile' : 'Tutor Onboarding Application'}</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {isApproved
              ? 'Update your bio, teaching rates, and weekly availability.'
              : 'Complete your application to start teaching on LAMIF. Free to apply with verified credentials.'}
          </p>
        </div>
        {isApproved && (
          <Link to={`/tutors/${existing._id}`} className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            View public profile
          </Link>
        )}
      </div>

      {/* Verification Status Banner */}
      {existing && (
        <div className="glass-card card" style={{
          marginBottom: '24px',
          borderLeft: isApproved ? '4px solid #10b981' : isNeedsChanges ? '4px solid #f97316' : isRejected ? '4px solid #ef4444' : '4px solid #3b82f6'
        }}>
          <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="row" style={{ gap: '10px', marginBottom: '8px' }}>
                <span className={`status-badge status-${currentStatus}`}>{statusLabel(currentStatus)}</span>
                <strong>
                  {currentStatus === 'draft' && 'Draft Application'}
                  {['submitted', 'pending'].includes(currentStatus) && 'Application Submitted & Queued for Review'}
                  {currentStatus === 'under_review' && 'Application Currently Under Review'}
                  {currentStatus === 'needs_changes' && 'Action Required: Revisions Requested'}
                  {currentStatus === 'approved' && 'Verified Educator Profile Active'}
                  {currentStatus === 'rejected' && 'Application Not Approved'}
                </strong>
              </div>

              {currentStatus === 'draft' && (
                <p className="muted small" style={{ margin: 0 }}>
                  You can save your draft and return at any time. When ready, click "Submit Application for Review".
                </p>
              )}

              {['submitted', 'pending'].includes(currentStatus) && (
                <p className="muted small" style={{ margin: 0 }}>
                  Your application and documents have been received by LAMIF administrators. You will receive an in-app and email notification as soon as a decision is made.
                </p>
              )}

              {currentStatus === 'under_review' && (
                <p className="muted small" style={{ margin: 0 }}>
                  An administrator is actively reviewing your qualifications and verification documents.
                </p>
              )}

              {isNeedsChanges && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                  <strong style={{ display: 'block', color: '#c2410c', marginBottom: '4px' }}>Reviewer Note:</strong>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {existing.adminFeedback?.note || 'Please review and update your application details.'}
                  </p>
                  <p className="muted small" style={{ margin: '6px 0 0' }}>
                    Make the requested adjustments below, then click "Resubmit Application".
                  </p>
                </div>
              )}

              {isApproved && (
                <p className="muted small" style={{ margin: 0 }}>
                  Your profile displays the Verified badge. Students can find you in search and book sessions directly.
                </p>
              )}

              {isRejected && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <strong style={{ display: 'block', color: '#b91c1c', marginBottom: '4px' }}>Rejection Reason:</strong>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {existing.adminFeedback?.rejectionReason || 'Application does not meet platform verification criteria.'}
                  </p>
                  <p className="muted small" style={{ margin: '6px 0 0' }}>
                    {canReapply
                      ? 'The reapplication cooldown period has ended. You may reopen your application to make updates and reapply.'
                      : `You may reapply after ${formatDate(existing.reapplyAllowedAt)}.`}
                  </p>
                </div>
              )}
            </div>

            {isRejected && canReapply && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleReapply}
                disabled={reapplying}
              >
                {reapplying ? 'Reopening...' : 'Reopen Application to Reapply'}
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); saveApplication('submit'); }} className="stack">
        {/* SECTION 1: Personal & Identity Verification */}
        <div className="glass-card card">
          <div className="row-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>1. Personal & Identity Verification</h3>
            <span className="small muted">Private & encrypted</span>
          </div>

          <div className="row" style={{ gap: '16px', marginBottom: '16px' }}>
            {photo
              ? <img className="avatar" src={URL.createObjectURL(photo)} alt="New profile" />
              : <Avatar path={existing?.profilePictureUrl} name={existing?.user?.name || user?.name} />}
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label htmlFor="p-photo">Profile Photo (JPG/PNG, max 10MB)</label>
              <input id="p-photo" type="file" accept="image/png,image/jpeg" onChange={e => setPhoto(e.target.files[0])} />
              <span className="muted small">A clear, professional headshot helps students feel confident booking with you.</span>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Applicant Full Name</label>
              <input type="text" value={existing?.user?.name || user?.name || ''} disabled style={{ opacity: 0.8, cursor: 'not-allowed' }} />
            </div>
            <div className="field">
              <label>Registered Email</label>
              <input type="email" value={existing?.user?.email || user?.email || ''} disabled style={{ opacity: 0.8, cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-phone">Phone Number *</label>
              <input
                id="p-phone"
                type="tel"
                placeholder="e.g. +251 91 234 5678 or 0912345678"
                value={form.phoneNumber}
                onChange={e => update('phoneNumber', e.target.value)}
                required={!isApproved && currentStatus !== 'draft'}
              />
              <span className="muted small">Kept private. Used for identity verification and administrative contact.</span>
            </div>
            <div className="field">
              <label htmlFor="p-id">National / Kebele / Passport ID Number *</label>
              <input
                id="p-id"
                type="text"
                placeholder="e.g. ET-12345678"
                value={form.idNumber}
                onChange={e => update('idNumber', e.target.value)}
                required={!isApproved && currentStatus !== 'draft'}
              />
              <span className="muted small">Unique ID number to prevent duplicate accounts.</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-iddoc">Government ID Photo / Document (JPG/PNG/PDF) *</label>
            <input
              id="p-iddoc"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={e => setIdDocFile(e.target.files[0])}
            />
            {existing?.idDocumentFile && (
              <p className="small success-text" style={{ margin: '6px 0 0' }}>
                ✓ ID Document previously uploaded.{' '}
                <a
                  href={apiUrl(`/tutor/${existing._id}/document/id?token=${token}`)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  View your uploaded ID
                </a>
              </p>
            )}
            <span className="muted small">Stored securely in segregated storage. Never displayed on public tutor pages.</span>
          </div>

          <div className="field">
            <label htmlFor="p-loc">City / Location</label>
            <input
              id="p-loc"
              placeholder="e.g. Addis Ababa (Bole), Bahir Dar, Hawassa"
              value={form.location}
              onChange={e => update('location', e.target.value)}
            />
          </div>
        </div>

        {/* SECTION 2: Academic Background & Credentials */}
        <div className="glass-card card">
          <div className="row-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>2. Academic Background & Credentials</h3>
          </div>

          <div className="field">
            <label htmlFor="p-edu">Education & University Background *</label>
            <input
              id="p-edu"
              placeholder="e.g. BSc in Applied Mathematics, Addis Ababa University (2021)"
              value={form.education}
              onChange={e => update('education', e.target.value)}
              required={currentStatus !== 'draft'}
            />
          </div>

          <div className="field">
            <label htmlFor="p-cv">Curriculum Vitae (CV / Resume) (PDF/DOCX, max 10MB)</label>
            <input id="p-cv" type="file" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files[0])} />
            {existing?.cvUrl && (
              <p className="small success-text" style={{ margin: '6px 0 0' }}>
                ✓ Current CV on file:{' '}
                <a href={fileUrl(existing.cvUrl)} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                  View CV
                </a>
              </p>
            )}
          </div>

          {/* Certificates */}
          <div style={{ marginTop: '16px' }}>
            <div className="row-between" style={{ marginBottom: '8px' }}>
              <label style={{ margin: 0, fontWeight: 600 }}>Certificates & Professional Licenses</label>
              <button type="button" className="btn-ghost btn-sm" onClick={addCertificate}>
                + Add Certificate
              </button>
            </div>
            {form.certificates.length === 0 && (
              <p className="muted small">No certificates added yet (e.g. CELTA, Teaching License, National Exam Honors).</p>
            )}

            {form.certificates.map((cert, index) => (
              <div key={index} className="glass-card" style={{ padding: '12px', marginBottom: '10px' }}>
                <div className="form-grid" style={{ marginBottom: '8px' }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="small">Certificate Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Certified English Teacher"
                      value={cert.name}
                      onChange={e => updateCertificate(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="small">Issuing Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Cambridge / AAU"
                      value={cert.issuer || ''}
                      onChange={e => updateCertificate(index, 'issuer', e.target.value)}
                    />
                  </div>
                </div>

                <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '100px' }}>
                    <label className="small">Year</label>
                    <input
                      type="number"
                      placeholder="2022"
                      value={cert.year || ''}
                      onChange={e => updateCertificate(index, 'year', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Document File (PDF / Image)</label>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg"
                      onChange={e => setCertFiles(prev => ({ ...prev, [index]: e.target.files[0] }))}
                    />
                  </div>
                  {existing?._id && cert.file && (
                    <a
                      href={apiUrl(`/tutor/${existing._id}/document/certificate?index=${index}&token=${token}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost btn-sm"
                      style={{ marginTop: '16px' }}
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-sm btn-danger"
                    onClick={() => removeCertificate(index)}
                    aria-label="Remove certificate"
                    style={{ marginTop: '16px' }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Subjects, Experience & Teaching Philosophy */}
        <div className="glass-card card">
          <div className="row-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>3. Subjects, Experience & Teaching Philosophy</h3>
          </div>

          <div className="field">
            <label htmlFor="p-headline">Professional Headline *</label>
            <input
              id="p-headline"
              maxLength={120}
              placeholder="e.g. Mathematics & Physics Specialist | Grade 12 National Exam Prep"
              value={form.headline}
              onChange={e => update('headline', e.target.value)}
              required={currentStatus !== 'draft'}
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-subj">Subjects Offered * (comma-separated)</label>
              <input
                id="p-subj"
                placeholder="e.g. Mathematics, Physics, Chemistry, IELTS, SAT, Python"
                value={form.subjects}
                onChange={e => update('subjects', e.target.value)}
                required={currentStatus !== 'draft'}
              />
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="muted small" style={{ width: '100%' }}>Click to add popular curriculum subjects:</span>
                {QUICK_SUBJECTS.map(s => {
                  const active = (form.subjects || '').split(',').map(x => x.trim().toLowerCase()).includes(s.toLowerCase())
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`chip ${active ? 'selected' : ''}`}
                      style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                      onClick={() => addSubject(s)}
                    >
                      {active ? '✓ ' : '+ '} {s}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="p-exp">Years of Tutoring Experience</label>
              <input
                id="p-exp"
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 4"
                value={form.experienceYears}
                onChange={e => update('experienceYears', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-bio">About You & Teaching Approach *</label>
            <textarea
              id="p-bio"
              rows="5"
              placeholder="Describe your background, teaching methodology, past student outcomes, and what students can anticipate in your sessions."
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              required={currentStatus !== 'draft'}
            />
          </div>

          <div className="field">
            <label htmlFor="p-stmt">Teaching Philosophy / Statement *</label>
            <textarea
              id="p-stmt"
              rows="3"
              placeholder="A short statement explaining your educational philosophy and how you motivate students to master difficult concepts."
              value={form.teachingStatement}
              onChange={e => update('teachingStatement', e.target.value)}
              required={currentStatus !== 'draft'}
            />
            <span className="muted small">Reviewed carefully by the admin verification committee.</span>
          </div>

          <div className="field">
            <label htmlFor="p-lang">Languages Spoken (comma-separated)</label>
            <input
              id="p-lang"
              placeholder="e.g. Amharic, English, Afaan Oromo, Arabic"
              value={form.languages}
              onChange={e => update('languages', e.target.value)}
            />
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span className="muted small" style={{ width: '100%' }}>Click to add languages:</span>
              {QUICK_LANGUAGES.map(l => {
                const active = (form.languages || '').split(',').map(x => x.trim().toLowerCase()).includes(l.toLowerCase())
                return (
                  <button
                    key={l}
                    type="button"
                    className={`chip ${active ? 'selected' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                    onClick={() => addLanguage(l)}
                  >
                    {active ? '✓ ' : '+ '} {l}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* SECTION 4: Rates & Availability */}
        <div className="glass-card card">
          <div className="row-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>4. Instruction Modes, Rates & Availability</h3>
          </div>

          <div className="field">
            <label>Instruction Modes Offered</label>
            <div className="row" style={{ gap: '16px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.teachingModes.includes('online')}
                  onChange={() => toggleMode('online')}
                />
                Online sessions
              </label>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.teachingModes.includes('in_person')}
                  onChange={() => toggleMode('in_person')}
                />
                In-person sessions
              </label>
            </div>
          </div>

          <div className="form-grid">
            {form.teachingModes.includes('online') && (
              <div className="field">
                <label htmlFor="p-rate-on">Online Hourly Rate (ETB) *</label>
                <input
                  id="p-rate-on"
                  type="number"
                  min="0"
                  step="25"
                  placeholder="e.g. 350"
                  value={form.hourlyRateOnline}
                  onChange={e => update('hourlyRateOnline', e.target.value)}
                  required={currentStatus !== 'draft'}
                />
              </div>
            )}
            {form.teachingModes.includes('in_person') && (
              <div className="field">
                <label htmlFor="p-rate-ip">In-Person Hourly Rate (ETB) *</label>
                <input
                  id="p-rate-ip"
                  type="number"
                  min="0"
                  step="25"
                  placeholder="e.g. 500"
                  value={form.hourlyRateInPerson}
                  onChange={e => update('hourlyRateInPerson', e.target.value)}
                  required={currentStatus !== 'draft'}
                />
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-max">Max Concurrent Active Students</label>
              <input
                id="p-max"
                type="number"
                min="1"
                max="50"
                value={form.maxActiveStudents}
                onChange={e => update('maxActiveStudents', e.target.value)}
              />
              <span className="muted small">Shows "Fully booked" when this threshold is reached.</span>
            </div>
            <div className="field">
              <label>Taking New Students</label>
              <div className="row" style={{ marginTop: '8px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={e => update('isAvailable', e.target.checked)}
                  />
                  Available for booking requests
                </label>
              </div>
            </div>
          </div>

          {/* Weekly Availability Slots */}
          <div style={{ marginTop: '16px' }}>
            <div className="row-between" style={{ marginBottom: '8px' }}>
              <label style={{ margin: 0, fontWeight: 600 }}>Weekly Teaching Hours (Addis Ababa Time, EAT)</label>
              <button type="button" className="btn-ghost btn-sm" onClick={addSlot}>+ Add Time Slot</button>
            </div>
            {form.availability.length === 0 && <p className="muted small">No availability slots set yet.</p>}
            {form.availability.map((slot, index) => (
              <div key={index} className="row" style={{ marginBottom: '10px', flexWrap: 'nowrap' }}>
                <select className="input" style={{ width: 'auto' }} value={slot.day} onChange={e => updateSlot(index, 'day', e.target.value)} aria-label="Day">
                  {DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
                </select>
                <input className="input" type="time" value={slot.start} onChange={e => updateSlot(index, 'start', e.target.value)} aria-label="Start" />
                <span className="muted">to</span>
                <input className="input" type="time" value={slot.end} onChange={e => updateSlot(index, 'end', e.target.value)} aria-label="End" />
                <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => removeSlot(index)} aria-label="Remove slot">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Verification Agreement & Consent */}
        <div className="glass-card card" style={{ background: 'color-mix(in srgb, var(--primary) 5%, transparent)' }}>
          <h3 style={{ margin: '0 0 12px' }}>5. Verification Agreement & Platform Consent</h3>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ marginTop: '4px' }}
              checked={form.agreementAccepted}
              onChange={e => update('agreementAccepted', e.target.checked)}
            />
            <span style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
              <strong>I certify under penalty of account termination</strong> that all personal, identification, academic, and certificate documents provided are authentic and belong to me. I agree to uphold LAMIF's Tutor Code of Conduct, respect student commitments, and acknowledge that only verified tutors appear publicly.
            </span>
          </label>
        </div>

        {message.text && (
          <div className={`glass-card card ${message.ok ? 'success-text' : 'error-text'}`} style={{ padding: '14px 18px' }}>
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            {!isApproved && (
              <button
                type="button"
                className="btn-ghost"
                disabled={saving}
                onClick={() => saveApplication('draft')}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            )}
          </div>

          <div className="row" style={{ gap: '12px' }}>
            {isApproved ? (
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            ) : isNeedsChanges ? (
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Submitting...' : 'Resubmit Application'}
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Application for Review'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default ProfileEditor
