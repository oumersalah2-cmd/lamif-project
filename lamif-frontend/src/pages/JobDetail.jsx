import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TutorCard from '../components/TutorCard'
import HireModal from '../components/HireModal'
import api, { errorMessage, isUnverifiedError } from '../lib/api'
import { getUser } from '../lib/session'
import { conversationPath } from '../lib/messaging'
import { budgetText, formatDate, formatMoney, levelLabel, modeLabel, statusLabel, timeAgo } from '../lib/format'

function ProposalForm({ job, onSent }) {
  const user = getUser()
  const [form, setForm] = useState({ coverLetter: '', rate: job.budgetMax ?? '' })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(user && user.emailVerified === false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await api.post(`/jobs/${job._id}/proposals`, form)
      onSent()
    } catch (err) {
      if (isUnverifiedError(err)) {
        setUnverified(true)
        setError('Please verify your email address to submit a proposal.')
      } else {
        setError(errorMessage(err))
      }
      setSending(false)
    }
  }

  return (
    <form className="glass-card card" onSubmit={handleSubmit}>
      <h3>Submit a proposal</h3>
      <div className="field">
        <label htmlFor="pr-rate">Your hourly rate for this job (ETB)</label>
        <input id="pr-rate" type="number" min="0" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} required />
        <span className="hint">Client budget: {budgetText(job)}. If you're hired, this rate is locked into the contract.</span>
      </div>
      <div className="field">
        <label htmlFor="pr-letter">Cover letter</label>
        <textarea id="pr-letter" rows="6" placeholder="Why you're a great fit, your approach, and when you're available" value={form.coverLetter} onChange={e => setForm({ ...form, coverLetter: e.target.value })} required />
      </div>
      {(error || unverified) && (
        <div className="error-text" style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', margin: '12px 0', fontSize: '0.9rem' }}>
          {unverified ? (
            <span>
              Please verify your email address before sending proposals.{' '}
              <Link to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                Verify your email
              </Link>
            </span>
          ) : (
            error
          )}
        </div>
      )}
      <button className="btn-primary btn-sm" disabled={sending}>{sending ? 'Sending...' : 'Send proposal'}</button>
    </form>
  )
}

function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [hiring, setHiring] = useState(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    api.get(`/jobs/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(errorMessage(err, 'Job not found')))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="page"><div className="glass-card empty">{error}</div></div>
  if (!data) return <div className="page"><p className="muted">Loading...</p></div>

  const { job, isOwner, proposals, myProposal, hasProfile } = data

  const act = async (request, message) => {
    try {
      await request()
      setNotice(message)
      load()
    } catch (err) {
      setNotice(errorMessage(err))
    }
  }

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <Link to="/jobs" className="muted small link row" style={{ gap: '6px', display: 'inline-flex' }}><Icon name="arrowRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back to jobs</Link>
      {notice && <div className="glass-card card" style={{ margin: '16px 0' }}>{notice}</div>}

      <div className="glass-card card" style={{ marginTop: '12px' }}>
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '1.9rem' }}>{job.title}</h1>
            <p className="muted small" style={{ margin: 0 }}>
              Posted {timeAgo(job.createdAt)} by {job.student?.name}
              {job.studentName && <span> (Student: <strong>{job.studentName}</strong>)</span>}
            </p>
          </div>
          <span className={`status-badge status-${job.status}`}>{statusLabel(job.status)}</span>
        </div>

        {/* Managed Tutoring Status Banners */}
        {job.status === 'under_review' && (
          <div
            className="glass-card card"
            style={{
              background: 'rgba(245, 158, 11, 0.09)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              margin: '18px 0',
              padding: '18px 20px'
            }}
          >
            <div className="row" style={{ alignItems: 'flex-start', gap: '14px' }}>
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>⏳</span>
              <div>
                <h3 style={{ margin: '0 0 6px', color: '#f59e0b', fontSize: '1.15rem' }}>
                  Request Under Review (በግምገማ ላይ)
                </h3>
                <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
                  Our academic coordination team at <strong>LAMIF</strong> has received your request. We are reviewing your student's learning goals, grade level, and location to assign the best verified teacher based on skill and subject expertise.
                </p>
                <p className="small muted" style={{ margin: 0 }}>
                  📞 We will call you at <strong>{job.phoneNumber || 'your registered phone'}</strong> within 24 hours to confirm the educator and schedule.
                </p>
              </div>
            </div>
          </div>
        )}

        {job.assignedTutor && (
          <div
            className="glass-card card"
            style={{
              background: 'rgba(16, 185, 129, 0.09)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              margin: '18px 0',
              padding: '20px'
            }}
          >
            <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div className="row" style={{ alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>🎉</span>
                <div>
                  <span className="hero-pill" style={{ display: 'inline-block', marginBottom: '6px', fontSize: '0.78rem' }}>
                    Teacher Assigned by LAMIF
                  </span>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#10b981' }}>
                    {job.assignedTutor.user?.name}
                  </h3>
                  <p className="muted small" style={{ margin: '0 0 6px' }}>
                    {job.assignedTutor.headline || 'Verified Educator at LAMIF'}
                  </p>
                  <div className="row" style={{ gap: '6px' }}>
                    {(job.assignedTutor.subjects || []).slice(0, 3).map(s => (
                      <span key={s} className="subject-tag">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: '8px' }}>
                <Link to={`/tutors/${job.assignedTutor._id}`} className="btn-primary btn-sm">
                  View Educator Profile
                </Link>
                {job.assignedTutor.user?._id && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={async () => navigate(await conversationPath(job.assignedTutor.user._id))}
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
            {job.adminNotes && (
              <p className="small muted" style={{ marginTop: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                <strong>Coordinator Note:</strong> {job.adminNotes}
              </p>
            )}
          </div>
        )}

        <div className="tutor-meta" style={{ margin: '16px 0' }}>
          <span><strong>{budgetText(job)}</strong></span>
          <span>{modeLabel(job.mode)}</span>
          <span>{levelLabel(job.level)}</span>
          {job.location && <span><Icon name="pin" size={14} />{job.location}</span>}
          {job.preferredSchedule && <span><Icon name="clock" size={14} />{job.preferredSchedule}</span>}
          {job.preferredGender && job.preferredGender !== 'any' && (
            <span>Preferred: {job.preferredGender === 'female' ? 'Female educator' : 'Male educator'}</span>
          )}
        </div>
        <span className="subject-tag">{job.subject}</span>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: '14px', lineHeight: 1.6 }}>{job.description}</p>
        {isOwner && (job.status === 'open' || job.status === 'under_review') && (
          <button className="btn-ghost btn-sm btn-danger" onClick={() => window.confirm('Cancel this tutoring request?') && act(() => api.put(`/jobs/${job._id}/close`), 'Request cancelled.')}>
            Cancel request
          </button>
        )}
      </div>

      {isOwner && (
        <div style={{ marginTop: '28px' }}>
          <h2>Proposals ({proposals.length})</h2>
          {proposals.length === 0 ? (
            <div className="glass-card empty">No proposals yet. Tutors usually respond within a day.</div>
          ) : (
            <div className="stack">
              {proposals.map(proposal => (
                <div key={proposal._id} className="stack" style={{ gap: '0' }}>
                  <TutorCard
                    tutor={proposal.tutor}
                    action={<span className={`status-badge status-${proposal.status}`}>{statusLabel(proposal.status)}</span>}
                  />
                  <div className="glass-card card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
                    <p style={{ marginTop: 0 }}><strong>Proposed rate: {formatMoney(proposal.rate)}/hr</strong> <span className="muted small">· sent {formatDate(proposal.createdAt)}</span></p>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{proposal.coverLetter}</p>
                    <div className="row">
                      {proposal.status === 'submitted' && job.status === 'open' && (
                        <>
                          <button className="btn-primary btn-sm" onClick={() => setHiring(proposal)}>Hire</button>
                          <button className="btn-ghost btn-sm btn-danger" onClick={() => act(() => api.put(`/proposals/${proposal._id}/decline`), 'Proposal declined.')}>Decline</button>
                        </>
                      )}
                      <button className="btn-ghost btn-sm" onClick={async () => navigate(await conversationPath(proposal.tutor.user._id))}>Message</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.role === 'tutor' && (
        <div style={{ marginTop: '28px' }}>
          {myProposal && myProposal.status !== 'withdrawn' ? (
            <div className="glass-card card">
              <div className="row-between">
                <h3 style={{ margin: 0 }}>Your proposal</h3>
                <span className={`status-badge status-${myProposal.status}`}>{statusLabel(myProposal.status)}</span>
              </div>
              <p><strong>{formatMoney(myProposal.rate)}/hr</strong></p>
              <p style={{ whiteSpace: 'pre-wrap' }} className="muted">{myProposal.coverLetter}</p>
              {myProposal.status === 'submitted' && (
                <button className="btn-ghost btn-sm btn-danger" onClick={() => act(() => api.put(`/proposals/${myProposal._id}/withdraw`), 'Proposal withdrawn.')}>Withdraw</button>
              )}
              {myProposal.status === 'accepted' && <Link className="btn-primary btn-sm" style={{ textDecoration: 'none' }} to="/dashboard">View contract</Link>}
            </div>
          ) : job.status !== 'open' ? (
            <div className="glass-card empty">This job is no longer accepting proposals.</div>
          ) : !hasProfile ? (
            <div className="glass-card empty"><Link className="success-text" to="/profile/edit">Create your tutor profile</Link> to send proposals.</div>
          ) : (
            <ProposalForm job={job} onSent={() => { setNotice('Proposal sent!'); load() }} />
          )}
        </div>
      )}

      {!user && job.status === 'open' && (
        <div className="glass-card empty" style={{ marginTop: '28px' }}>
          <Link className="success-text" to="/login" state={{ from: `/jobs/${job._id}` }}>Log in as a tutor</Link> to send a proposal.
        </div>
      )}

      {hiring && (
        <HireModal
          tutor={hiring.tutor}
          proposal={hiring}
          job={job}
          onClose={() => setHiring(null)}
          onDone={() => {
            setHiring(null)
            setNotice('Tutor hired! The contract is now on your dashboard.')
            load()
          }}
        />
      )}
    </div>
  )
}

export default JobDetail
