import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import api, { API_URL, apiUrl, errorMessage, fileUrl } from '../lib/api'
import { formatDate, formatMoney, statusLabel, levelLabel, modeLabel } from '../lib/format'

const TUTOR_FILTERS = [
  ['submitted', 'Submitted'],
  ['under_review', 'Under Review'],
  ['needs_changes', 'Needs Changes'],
  ['pending', 'Pending Legacy'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All Applications']
]

const REQUEST_FILTERS = [
  ['under_review', 'Under Review (New)'],
  ['assigned', 'Teacher Assigned'],
  ['open', 'Open Jobs'],
  ['closed', 'Closed / Cancelled'],
  ['', 'All Requests']
]

function Admin() {
  const [adminSection, setAdminSection] = useState('requests') // 'requests' | 'tutors'
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Tutor Applications State
  const [tutors, setTutors] = useState([])
  const [filter, setFilter] = useState('submitted')
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [decisionAction, setDecisionAction] = useState(null)
  const [actionFeedback, setActionFeedback] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  // Student / Family Requests State
  const [requests, setRequests] = useState([])
  const [requestFilter, setRequestFilter] = useState('under_review')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [approvedTutors, setApprovedTutors] = useState([])
  const [selectedAssignTutorId, setSelectedAssignTutorId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [submittingAssign, setSubmittingAssign] = useState(false)
  const [tutorSearch, setTutorSearch] = useState('')

  const token = localStorage.getItem('token') || ''

  const load = useCallback(() => {
    setError('')
    api.get('/admin/stats').then(res => setStats(res.data)).catch(err => setError(errorMessage(err)))
    api.get(`/admin/tutors${filter ? `?status=${filter}` : ''}`).then(res => setTutors(res.data.tutors)).catch(err => setError(errorMessage(err)))
    api.get(`/admin/requests${requestFilter ? `?status=${requestFilter}` : ''}`).then(res => setRequests(res.data.requests || [])).catch(err => setError(errorMessage(err)))
  }, [filter, requestFilter])

  useEffect(() => {
    load()
  }, [load])

  // Tutor Review Modal Helpers
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

  // Teacher Assignment Helpers
  const openAssignModal = async (req) => {
    setSelectedRequest(req)
    setSelectedAssignTutorId(req.assignedTutor?._id || '')
    setAssignNotes(req.adminNotes || '')
    setTutorSearch('')
    setAssignModalOpen(true)
    try {
      const res = await api.get('/admin/tutors?status=approved')
      setApprovedTutors(res.data.tutors || [])
    } catch {
      setApprovedTutors([])
    }
  }

  const closeAssignModal = () => {
    setAssignModalOpen(false)
    setSelectedRequest(null)
    setSelectedAssignTutorId('')
  }

  const matchesSkill = (tutor, req) => {
    if (!tutor || !req) return false
    const tutorSubjs = (tutor.subjects || []).map(s => s.toLowerCase())
    const reqSubj = (req.subject || '').toLowerCase()
    return tutorSubjs.some(s => s.includes(reqSubj) || reqSubj.includes(s))
  }

  const handleConfirmAssignment = async (e) => {
    e.preventDefault()
    if (!selectedRequest) return
    setSubmittingAssign(true)
    setError('')
    try {
      await api.put(`/admin/requests/${selectedRequest._id}/assign`, {
        tutorId: selectedAssignTutorId || null,
        adminNotes: assignNotes,
        status: selectedAssignTutorId ? 'assigned' : 'under_review'
      })
      setSuccessMsg('Educator assigned successfully and family notified!')
      closeAssignModal()
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmittingAssign(false)
    }
  }

  const filteredApprovedTutors = approvedTutors
    .filter(t => {
      if (!tutorSearch.trim()) return true
      const q = tutorSearch.toLowerCase()
      return (
        (t.user?.name || '').toLowerCase().includes(q) ||
        (t.subjects || []).some(s => s.toLowerCase().includes(q)) ||
        (t.headline || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const aMatch = matchesSkill(a, selectedRequest)
      const bMatch = matchesSkill(b, selectedRequest)
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return (a.user?.name || '').localeCompare(b.user?.name || '')
    })

  return (
    <div className="page" style={{ maxWidth: '1240px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <p className="eyebrow">Platform Operations & Coordination</p>
          <h1 style={{ margin: '4px 0 6px', fontSize: '2.2rem' }}>LAMIF Operations Center</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Manage incoming family tutoring requests, assign educators based on skills, and review educator applications.
          </p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>{error}</p>}
      {successMsg && <p className="success-text" style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>{successMsg}</p>}

      {stats && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          {[
            [requests.filter(r => r.status === 'under_review').length, 'Requests Under Review'],
            [stats.pendingTutors, 'Educator Queue'],
            [stats.students, 'Students & Families'],
            [stats.tutors, 'Registered Tutors'],
            [Object.values(stats.bookingsByStatus).reduce((a, b) => a + b, 0), 'Total Sessions'],
            [formatMoney(stats.completedVolume), 'Completed Volume']
          ].map(([value, label]) => (
            <div key={label} className="glass-card stat-tile">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* TOP SECTION NAVIGATION */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <button
          className={`btn-lg ${adminSection === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setAdminSection('requests')}
        >
          <Icon name="file" size={18} />
          <span>Student & Family Requests</span>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.2)', color: 'inherit', padding: '2px 8px', fontSize: '0.8rem' }}>
            {requests.length}
          </span>
        </button>

        <button
          className={`btn-lg ${adminSection === 'tutors' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setAdminSection('tutors')}
        >
          <Icon name="shield" size={18} />
          <span>Educator Applications</span>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.2)', color: 'inherit', padding: '2px 8px', fontSize: '0.8rem' }}>
            {tutors.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: STUDENT & FAMILY REQUESTS */}
      {adminSection === 'requests' && (
        <div>
          <div className="row-between" style={{ alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Family Requests Queue</h2>
              <span className="small muted">Assign verified educators based on subject, grade, and location.</span>
            </div>
            <span className="small muted">{requests.length} requests in this view</span>
          </div>

          <div className="tabs" style={{ marginBottom: '16px' }}>
            {REQUEST_FILTERS.map(([value, label]) => (
              <button
                key={label}
                className={`tab ${requestFilter === value ? 'active' : ''}`}
                onClick={() => setRequestFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="glass-card empty">No student or family requests matching this filter.</div>
          ) : (
            <div className="glass-card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Family / Student</th>
                    <th>Contact Phone</th>
                    <th>Subject & Grade</th>
                    <th>Format & Location</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Assigned Educator</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req._id}>
                      <td>
                        <div>
                          <strong>{req.studentName || req.student?.name || 'Student'}</strong>
                          <div className="muted small">{req.title}</div>
                          <div className="muted small">Requested {formatDate(req.createdAt)}</div>
                        </div>
                      </td>
                      <td>
                        {req.phoneNumber ? (
                          <a href={`tel:${req.phoneNumber}`} className="link" style={{ fontWeight: 600 }}>
                            📞 {req.phoneNumber}
                          </a>
                        ) : (
                          <span className="muted small">{req.student?.email || '—'}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.subject}</div>
                        <div className="muted small">{levelLabel(req.level)}</div>
                      </td>
                      <td>
                        <div className="small">{modeLabel(req.mode)}</div>
                        {req.location && <div className="muted small">📍 {req.location}</div>}
                      </td>
                      <td className="small" style={{ maxWidth: '180px' }}>
                        {req.preferredSchedule || <span className="muted">Flexible</span>}
                        {req.preferredGender && req.preferredGender !== 'any' && (
                          <div className="muted small">Pref: {req.preferredGender}</div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${req.status}`}>
                          {statusLabel(req.status)}
                        </span>
                      </td>
                      <td>
                        {req.assignedTutor ? (
                          <div>
                            <Link to={`/tutors/${req.assignedTutor._id}`} className="link" style={{ fontWeight: 600 }}>
                              {req.assignedTutor.user?.name}
                            </Link>
                            {req.assignedTutor.phoneNumber && (
                              <div className="muted small">📞 {req.assignedTutor.phoneNumber}</div>
                            )}
                          </div>
                        ) : (
                          <span className="muted small" style={{ fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={req.assignedTutor ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                          onClick={() => openAssignModal(req)}
                        >
                          {req.assignedTutor ? 'Change Educator' : 'Assign Educator'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: TUTOR APPLICATIONS & VERIFICATIONS */}
      {adminSection === 'tutors' && (
        <div>
          <div className="row-between" style={{ alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ margin: 0 }}>Educator Applications Queue</h2>
            <span className="small muted">{tutors.length} applications in this view</span>
          </div>

          <div className="tabs" style={{ marginBottom: '16px' }}>
            {TUTOR_FILTERS.map(([value, label]) => (
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
            <div className="glass-card empty">No educator applications matching this filter.</div>
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
        </div>
      )}

      {/* MODAL 1: ASSIGN EDUCATOR BASED ON SKILL */}
      {assignModalOpen && selectedRequest && (
        <div className="modal-overlay" onClick={closeAssignModal}>
          <div
            className="glass-card modal"
            style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="row-between" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span className="hero-pill" style={{ display: 'inline-block', marginBottom: '6px', fontSize: '0.78rem' }}>
                  Educator Matching & Assignment
                </span>
                <h2 style={{ margin: 0, fontSize: '1.45rem' }}>
                  Assign Teacher for: {selectedRequest.studentName || selectedRequest.student?.name}
                </h2>
              </div>
              <button className="icon-btn" onClick={closeAssignModal}><Icon name="close" /></button>
            </div>

            {/* Request Summary Card */}
            <div className="glass-card card" style={{ background: 'var(--bg-elevated)', marginBottom: '20px', padding: '16px' }}>
              <div className="form-grid" style={{ rowGap: '10px' }}>
                <div>
                  <span className="muted small">Subject Needed:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>{selectedRequest.subject}</div>
                </div>
                <div>
                  <span className="muted small">Grade Level:</span>
                  <div style={{ fontWeight: 600 }}>{levelLabel(selectedRequest.level)}</div>
                </div>
                <div>
                  <span className="muted small">Format & Location:</span>
                  <div style={{ fontWeight: 600 }}>{modeLabel(selectedRequest.mode)} {selectedRequest.location ? `· ${selectedRequest.location}` : ''}</div>
                </div>
                <div>
                  <span className="muted small">Family Phone Contact:</span>
                  <div>
                    <a href={`tel:${selectedRequest.phoneNumber}`} className="link" style={{ fontWeight: 700 }}>
                      📞 {selectedRequest.phoneNumber || 'Not provided'}
                    </a>
                  </div>
                </div>
              </div>
              {selectedRequest.preferredSchedule && (
                <div style={{ marginTop: '10px', fontSize: '0.88rem' }}>
                  <span className="muted">Schedule Preference:</span> <strong>{selectedRequest.preferredSchedule}</strong>
                </div>
              )}
              {selectedRequest.description && (
                <div style={{ marginTop: '8px', fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  "{selectedRequest.description}"
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmAssignment}>
              <div className="field">
                <div className="row-between" style={{ alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Select Qualified Educator from Company Pool</label>
                  <input
                    type="search"
                    placeholder="Search by educator name or subject..."
                    value={tutorSearch}
                    onChange={e => setTutorSearch(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem', width: '260px' }}
                  />
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredApprovedTutors.length === 0 ? (
                    <p className="muted small" style={{ padding: '16px', textAlign: 'center' }}>No approved educators found.</p>
                  ) : (
                    filteredApprovedTutors.map(tutor => {
                      const isSkillMatch = matchesSkill(tutor, selectedRequest)
                      const isSelected = selectedAssignTutorId === tutor._id
                      return (
                        <div
                          key={tutor._id}
                          className={`glass-card ${isSelected ? 'selected' : ''}`}
                          style={{
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                          }}
                          onClick={() => setSelectedAssignTutorId(tutor._id)}
                        >
                          <div className="row" style={{ alignItems: 'center', gap: '12px' }}>
                            <input
                              type="radio"
                              name="assignedTutor"
                              checked={isSelected}
                              onChange={() => setSelectedAssignTutorId(tutor._id)}
                            />
                            <Avatar path={tutor.profilePictureUrl} name={tutor.user?.name} className="avatar-sm" />
                            <div>
                              <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                                <strong>{tutor.user?.name}</strong>
                                {isSkillMatch && (
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    ⭐ Skill Match
                                  </span>
                                )}
                              </div>
                              <div className="muted small">{tutor.headline || 'Educator'}</div>
                              <div className="small muted" style={{ marginTop: '2px' }}>
                                Subjects: {(tutor.subjects || []).join(', ')}
                              </div>
                            </div>
                          </div>
                          {tutor.phoneNumber && (
                            <div className="small muted">📞 {tutor.phoneNumber}</div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="field" style={{ marginTop: '16px' }}>
                <label htmlFor="admin-notes">Internal Coordinator Notes (Optional)</label>
                <textarea
                  id="admin-notes"
                  rows="3"
                  placeholder="e.g. Spoke with student's mother via phone; agreed on 3 days a week at 4:30 PM starting Monday..."
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                />
              </div>

              <div className="row-between" style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <button type="button" className="btn-ghost" onClick={closeAssignModal}>Cancel</button>
                <div className="row" style={{ gap: '8px' }}>
                  {selectedAssignTutorId && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm btn-danger"
                      onClick={() => { setSelectedAssignTutorId(''); }}
                    >
                      Clear Selection
                    </button>
                  )}
                  <button className="btn-primary" disabled={submittingAssign}>
                    {submittingAssign ? 'Assigning...' : '✓ Confirm Educator Assignment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TUTOR APPLICATION REVIEW MODAL */}
      {selectedTutor && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div
            className="glass-card modal"
            style={{ maxWidth: '850px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="row-between" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
                <Avatar path={selectedTutor.profilePictureUrl} name={selectedTutor.user?.name} className="avatar-lg" />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem' }}>{selectedTutor.user?.name}</h2>
                  <div className="muted small">{selectedTutor.user?.email}</div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`status-badge status-${selectedTutor.verificationStatus}`}>
                      {statusLabel(selectedTutor.verificationStatus)}
                    </span>
                  </div>
                </div>
              </div>
              <button className="icon-btn" onClick={closeReviewModal}><Icon name="close" /></button>
            </div>

            <div className="stack" style={{ gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', color: 'var(--primary)' }}>Application Overview</h4>
                <div className="form-grid" style={{ rowGap: '12px' }}>
                  <div>
                    <span className="muted small">National ID / Passport Number:</span>
                    <div><strong>{selectedTutor.idNumber || 'Not provided'}</strong></div>
                  </div>
                  <div>
                    <span className="muted small">Phone Number:</span>
                    <div><strong>{selectedTutor.phoneNumber || 'Not provided'}</strong></div>
                  </div>
                  <div>
                    <span className="muted small">Tutoring Experience:</span>
                    <div><strong>{selectedTutor.experienceYears ? `${selectedTutor.experienceYears} Years` : '0 Years'}</strong></div>
                  </div>
                  <div>
                    <span className="muted small">Instruction Modes:</span>
                    <div><strong>{(selectedTutor.teachingModes || []).join(', ') || 'Online'}</strong></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', color: 'var(--primary)' }}>Submitted Documents & Verification</h4>
                <div className="stack" style={{ gap: '10px' }}>
                  <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Government Issued ID / Passport</strong>
                      <div className="muted small">Required for identity verification before teaching minors.</div>
                    </div>
                    {selectedTutor.idDocumentFile ? (
                      <a
                        className="btn-secondary btn-sm"
                        target="_blank"
                        rel="noreferrer"
                        href={apiUrl(`/tutor/${selectedTutor._id}/document/id?token=${token}`)}
                      >
                        View ID Document
                      </a>
                    ) : (
                      <span className="muted small">No file attached</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>Subjects Offered</h4>
                <p style={{ margin: 0 }}><strong>{(selectedTutor.subjects || []).join(', ')}</strong></p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>Bio & Background</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{selectedTutor.bio || 'None'}</p>
              </div>

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

              {/* Action Form for Needs Changes or Reject */}
              {decisionAction && (
                <form onSubmit={handleActionSubmit} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div className="field">
                    <label>
                      {decisionAction === 'needs_changes' ? 'Notes on Required Changes *' : 'Reason for Rejection *'}
                    </label>
                    <textarea
                      rows="3"
                      value={actionFeedback}
                      onChange={e => setActionFeedback(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row" style={{ gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setDecisionAction(null)}>Cancel</button>
                    <button type="submit" className="btn-primary btn-sm" disabled={submittingDecision}>
                      {submittingDecision ? 'Submitting...' : 'Confirm Decision'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
