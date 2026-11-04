import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import api, { API_URL, apiUrl, errorMessage, fileUrl } from '../lib/api'
import { formatDate, formatMoney, statusLabel } from '../lib/format'

const FILTERS = [
  ['submitted', 'Submitted'],
  ['under_review', 'Under Review'],
  ['needs_changes', 'Needs Changes'],
  ['pending', 'Pending Legacy'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All Applications']
]

function Admin() {
  const [stats, setStats] = useState(null)
  const [tutors, setTutors] = useState([])
  const [filter, setFilter] = useState('submitted')
  const [error, setError] = useState('')
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [decisionAction, setDecisionAction] = useState(null) // 'needs_changes' | 'rejected'
  const [actionFeedback, setActionFeedback] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const token = localStorage.getItem('token') || ''

  const load = useCallback(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(err => setError(errorMessage(err)))
    api.get(`/admin/tutors${filter ? `?status=${filter}` : ''}`).then(res => setTutors(res.data.tutors)).catch(err => setError(errorMessage(err)))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const openReviewModal = async (tutor) => {
    setSelectedTutor(tutor)
    setDecisionAction(null)
    setActionFeedback('')
    setSuccessMsg('')
    try {
      const res = await api.get(`/admin/tutors/${tutor._id}`)
      setSelectedTutor(res.data.tutor)
    } catch {
      // fallback to row tutor
    }
  }

  const closeReviewModal = () => {
    setSelectedTutor(null)
    setDecisionAction(null)
    setActionFeedback('')
  }

  const setVerification = async (id, status, note = '', reason = '') => {
    setSubmittingDecision(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload = { status }
      if (status === 'needs_changes') payload.note = note
      if (status === 'rejected') payload.reason = reason

      await api.put(`/admin/tutors/${id}/verification`, payload)
      setSuccessMsg(`Application status updated to "${statusLabel(status)}" and tutor notified.`)
      load()
      // Refresh the modal view
      const updated = await api.get(`/admin/tutors/${id}`)
      setSelectedTutor(updated.data.tutor)
      setDecisionAction(null)
      setActionFeedback('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmittingDecision(false)
    }
  }

  const handleActionSubmit = (e) => {
    e.preventDefault()
    if (!selectedTutor) return

    if (decisionAction === 'needs_changes') {
      if (!actionFeedback.trim()) {
        setError('Please enter a note explaining the required changes.')
        return
      }
      setVerification(selectedTutor._id, 'needs_changes', actionFeedback, '')
    } else if (decisionAction === 'rejected') {
      if (!actionFeedback.trim()) {
        setError('Please enter a reason for rejection.')
        return
      }
      setVerification(selectedTutor._id, 'rejected', '', actionFeedback)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Platform Operations</p>
          <h1>Tutor Applications & Admin Queue</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Review tutor credentials, verify government ID documents, and manage approval decisions.
          </p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '16px' }}>{error}</p>}
      {successMsg && <p className="success-text" style={{ marginBottom: '16px' }}>{successMsg}</p>}

      {stats && (
        <div className="stat-grid" style={{ marginBottom: '28px' }}>
          {[
            [stats.pendingTutors, 'Queue for Review'],
            [stats.tutors, 'Total Tutors Registered'],
            [stats.students, 'Students'],
            [stats.openJobs, 'Open Tutoring Jobs'],
            [Object.values(stats.bookingsByStatus).reduce((a, b) => a + b, 0), 'Total Bookings'],
            [formatMoney(stats.completedVolume), 'Completed Volume']
          ].map(([value, label]) => (
            <div key={label} className="glass-card stat-tile">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="row-between" style={{ alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Applications Queue</h2>
        <span className="small muted">{tutors.length} applications in this view</span>
      </div>

      <div className="tabs">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            className={`tab ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tutors.length === 0 ? (
        <div className="glass-card empty">No tutor applications matching this filter.</div>
      ) : (
        <div className="glass-card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Contact & ID</th>
                <th>Subjects</th>
                <th>Education</th>
                <th>Submitted</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tutors.map(t => (
                <tr key={t._id}>
                  <td>
                    <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
                      <Avatar path={t.profilePictureUrl} name={t.user?.name} className="avatar-sm" />
                      <div>
                        <strong>{t.user?.name || 'Tutor'}</strong>
                        <div className="muted small">{t.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="small"><strong>ID:</strong> {t.idNumber || '—'}</div>
                    <div className="muted small"><strong>Tel:</strong> {t.phoneNumber || '—'}</div>
                  </td>
                  <td>
                    <div className="small">{(t.subjects || []).join(', ') || 'None'}</div>
                    {t.experienceYears ? <div className="muted small">{t.experienceYears} yrs exp</div> : null}
                  </td>
                  <td className="small" style={{ maxWidth: '200px' }}>
                    {t.education || <span className="muted">—</span>}
                  </td>
                  <td className="small">
                    {formatDate(t.submittedAt || t.createdAt)}
                  </td>
                  <td>
                    <span className={`status-badge status-${t.verificationStatus}`}>
                      {statusLabel(t.verificationStatus)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => openReviewModal(t)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAILED APPLICATION REVIEW MODAL */}
      {selectedTutor && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div
            className="glass-card modal"
            style={{ maxWidth: '850px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header row-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span className={`status-badge status-${selectedTutor.verificationStatus}`}>
                  {statusLabel(selectedTutor.verificationStatus)}
                </span>
                <h2 style={{ margin: '6px 0 2px' }}>Review Application: {selectedTutor.user?.name}</h2>
                <span className="muted small">Registered: {selectedTutor.user?.email} · Joined {formatDate(selectedTutor.createdAt)}</span>
              </div>
              <button className="btn-ghost btn-sm" onClick={closeReviewModal} aria-label="Close modal">
                <Icon name="close" size={20} />
              </button>
            </div>

            {error && <p className="error-text" style={{ marginBottom: '12px' }}>{error}</p>}
            {successMsg && <p className="success-text" style={{ marginBottom: '12px' }}>{successMsg}</p>}

            <div className="stack" style={{ gap: '18px' }}>
              {/* Identity & Verification Documents */}
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--primary-strong)' }}>Identity & Verification Documents</h4>
                <div className="form-grid" style={{ marginBottom: '12px' }}>
                  <div>
                    <span className="muted small">National / Kebele ID Number:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '1.05rem' }}>
                      {selectedTutor.idNumber || <span className="muted">Not provided</span>}
                    </p>
                  </div>
                  <div>
                    <span className="muted small">Contact Phone Number:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
                      {selectedTutor.phoneNumber || <span className="muted">Not provided</span>}
                    </p>
                  </div>
                  <div>
                    <span className="muted small">Location:</span>
                    <p style={{ margin: '2px 0 0' }}>{selectedTutor.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="muted small">Agreement Accepted:</span>
                    <p style={{ margin: '2px 0 0', color: selectedTutor.agreementAccepted ? '#10b981' : '#ef4444' }}>
                      {selectedTutor.agreementAccepted ? '✓ Yes, certified terms' : '✗ Not accepted'}
                    </p>
                  </div>
                </div>

                <div className="row" style={{ gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  {selectedTutor.idDocumentFile ? (
                    <a
                      href={apiUrl(`/tutor/${selectedTutor._id}/document/id?token=${token}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary btn-sm"
                    >
                      📄 Open Government ID Document
                    </a>
                  ) : (
                    <span className="muted small" style={{ color: '#ef4444' }}>⚠️ No ID document attached</span>
                  )}

                  {selectedTutor.cvUrl ? (
                    <a
                      href={fileUrl(selectedTutor.cvUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost btn-sm"
                    >
                      📎 View Candidate CV
                    </a>
                  ) : (
                    <span className="muted small">No CV attached</span>
                  )}
                </div>
              </div>

              {/* Certificates & Professional Licenses */}
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--primary-strong)' }}>
                  Professional Certificates & Credentials ({selectedTutor.certificates?.length || 0})
                </h4>
                {(!selectedTutor.certificates || selectedTutor.certificates.length === 0) ? (
                  <p className="muted small" style={{ margin: 0 }}>No extra certificates attached.</p>
                ) : (
                  <div className="stack" style={{ gap: '8px' }}>
                    {selectedTutor.certificates.map((cert, idx) => (
                      <div key={idx} className="row-between" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                        <div>
                          <strong>{cert.name}</strong>
                          <span className="muted small"> · {cert.issuer || 'Issuer N/A'} {cert.year ? `(${cert.year})` : ''}</span>
                        </div>
                        {cert.file ? (
                          <a
                            href={apiUrl(`/tutor/${selectedTutor._id}/document/certificate?index=${idx}&token=${token}`)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost btn-sm"
                          >
                            View Certificate File
                          </a>
                        ) : (
                          <span className="muted small">No file</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teaching Profile & Philosophy */}
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--primary-strong)' }}>Academic & Teaching Qualifications</h4>
                <div style={{ marginBottom: '10px' }}>
                  <span className="muted small">Education:</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{selectedTutor.education || '—'}</p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span className="muted small">Subjects & Experience:</span>
                  <p style={{ margin: '2px 0 0' }}>
                    <strong>{(selectedTutor.subjects || []).join(', ')}</strong>
                    {selectedTutor.experienceYears ? ` · ${selectedTutor.experienceYears} years experience` : ''}
                  </p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span className="muted small">Headline:</span>
                  <p style={{ margin: '2px 0 0', fontStyle: 'italic' }}>{selectedTutor.headline || '—'}</p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span className="muted small">Teaching Philosophy / Statement:</span>
                  <div style={{ margin: '4px 0 0', padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', fontSize: '0.92rem' }}>
                    {selectedTutor.teachingStatement || '—'}
                  </div>
                </div>
                <div>
                  <span className="muted small">About / Bio:</span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{selectedTutor.bio || '—'}</p>
                </div>
              </div>

              {/* Rates & Modes */}
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--primary-strong)' }}>Rates & Instruction Modes</h4>
                <div className="form-grid">
                  <div>
                    <span className="muted small">Modes:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{(selectedTutor.teachingModes || []).join(', ')}</p>
                  </div>
                  <div>
                    <span className="muted small">Online Rate:</span>
                    <p style={{ margin: '2px 0 0' }}>{selectedTutor.hourlyRateOnline ? `${selectedTutor.hourlyRateOnline} ETB/hr` : '—'}</p>
                  </div>
                  <div>
                    <span className="muted small">In-Person Rate:</span>
                    <p style={{ margin: '2px 0 0' }}>{selectedTutor.hourlyRateInPerson ? `${selectedTutor.hourlyRateInPerson} ETB/hr` : '—'}</p>
                  </div>
                  <div>
                    <span className="muted small">Languages:</span>
                    <p style={{ margin: '2px 0 0' }}>{(selectedTutor.languages || []).join(', ') || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Past Reviewer Notes */}
              {(selectedTutor.adminFeedback?.note || selectedTutor.adminFeedback?.rejectionReason) && (
                <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid #f59e0b' }}>
                  <strong className="small">Previous Admin Feedback:</strong>
                  {selectedTutor.adminFeedback?.note && (
                    <p className="small" style={{ margin: '4px 0' }}><strong>Change Note:</strong> {selectedTutor.adminFeedback.note}</p>
                  )}
                  {selectedTutor.adminFeedback?.rejectionReason && (
                    <p className="small" style={{ margin: '4px 0' }}><strong>Rejection Reason:</strong> {selectedTutor.adminFeedback.rejectionReason}</p>
                  )}
                  {selectedTutor.adminFeedback?.reviewedAt && (
                    <span className="muted small">Reviewed: {formatDate(selectedTutor.adminFeedback.reviewedAt)}</span>
                  )}
                </div>
              )}

              {/* Decision Actions Prompt */}
              {decisionAction && (
                <form onSubmit={handleActionSubmit} className="glass-card card" style={{
                  border: decisionAction === 'needs_changes' ? '2px solid #f97316' : '2px solid #ef4444',
                  background: decisionAction === 'needs_changes' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}>
                  <h4 style={{ margin: '0 0 8px' }}>
                    {decisionAction === 'needs_changes' ? 'Specify Required Changes' : 'Specify Reason for Rejection'}
                  </h4>
                  <p className="muted small" style={{ margin: '0 0 10px' }}>
                    This note will be displayed in the tutor\'s portal and sent to their email ({selectedTutor.user?.email}).
                  </p>
                  <textarea
                    rows="3"
                    className="input"
                    placeholder={
                      decisionAction === 'needs_changes'
                        ? 'e.g. Please upload a higher resolution photo of your Kebele ID, and specify your degree specialization.'
                        : 'e.g. Identity document could not be authenticated, or qualifications do not align with platform guidelines.'
                    }
                    value={actionFeedback}
                    onChange={e => setActionFeedback(e.target.value)}
                    required
                  />
                  <div className="row" style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setDecisionAction(null)}
                      disabled={submittingDecision}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`btn-sm ${decisionAction === 'needs_changes' ? 'btn-primary' : 'btn-ghost btn-danger'}`}
                      disabled={submittingDecision}
                    >
                      {submittingDecision ? 'Sending...' : (decisionAction === 'needs_changes' ? 'Send Changes Request' : 'Confirm Rejection')}
                    </button>
                  </div>
                </form>
              )}

              {/* Main Decision Buttons */}
              {!decisionAction && (
                <div className="row-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div className="row" style={{ gap: '8px' }}>
                    {selectedTutor.verificationStatus !== 'under_review' && selectedTutor.verificationStatus !== 'approved' && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={submittingDecision}
                        onClick={() => setVerification(selectedTutor._id, 'under_review')}
                      >
                        Mark Under Review
                      </button>
                    )}
                    {selectedTutor.verificationStatus !== 'needs_changes' && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        style={{ color: '#ea580c' }}
                        disabled={submittingDecision}
                        onClick={() => { setDecisionAction('needs_changes'); setActionFeedback(''); }}
                      >
                        Request Changes
                      </button>
                    )}
                    {selectedTutor.verificationStatus !== 'rejected' && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm btn-danger"
                        disabled={submittingDecision}
                        onClick={() => { setDecisionAction('rejected'); setActionFeedback(''); }}
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  <div>
                    {selectedTutor.verificationStatus !== 'approved' ? (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={submittingDecision}
                        onClick={() => setVerification(selectedTutor._id, 'approved')}
                      >
                        {submittingDecision ? 'Approving...' : '✓ Approve & Verify Tutor'}
                      </button>
                    ) : (
                      <span className="success-text" style={{ fontWeight: 600 }}>✓ Currently Approved</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
