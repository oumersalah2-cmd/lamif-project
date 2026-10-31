import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TutorCard from '../components/TutorCard'
import HireModal from '../components/HireModal'
import api, { errorMessage } from '../lib/api'
import { getUser } from '../lib/session'
import { conversationPath } from '../lib/messaging'
import { budgetText, formatDate, formatMoney, levelLabel, modeLabel, statusLabel, timeAgo } from '../lib/format'

function ProposalForm({ job, onSent }) {
  const [form, setForm] = useState({ coverLetter: '', rate: job.budgetMax ?? '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post(`/jobs/${job._id}/proposals`, form)
      onSent()
    } catch (err) {
      setError(errorMessage(err))
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
      {error && <p className="error-text">{error}</p>}
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
            <p className="muted small" style={{ margin: 0 }}>Posted {timeAgo(job.createdAt)} by {job.student?.name}</p>
          </div>
          <span className={`status-badge status-${job.status}`}>{statusLabel(job.status)}</span>
        </div>
        <div className="tutor-meta" style={{ margin: '16px 0' }}>
          <span><strong>{budgetText(job)}</strong></span>
          <span>{modeLabel(job.mode)}</span>
          <span>{levelLabel(job.level)}</span>
          {job.location && <span><Icon name="pin" size={14} />{job.location}</span>}
          <span>{job.proposalCount} proposal{job.proposalCount === 1 ? '' : 's'}</span>
        </div>
        <span className="subject-tag">{job.subject}</span>
        <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
        {isOwner && job.status === 'open' && (
          <button className="btn-ghost btn-sm btn-danger" onClick={() => window.confirm('Close this job? Pending proposals will be declined.') && act(() => api.put(`/jobs/${job._id}/close`), 'Job closed.')}>
            Close job
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
