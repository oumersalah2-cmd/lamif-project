import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import TutorBadges from '../components/TutorBadges'
import HireModal from '../components/HireModal'
import { StarRating } from '../components/StarRating'
import api, { errorMessage, fileUrl, isUnverifiedError } from '../lib/api'
import { getUser } from '../lib/session'
import { conversationPath } from '../lib/messaging'
import useSavedTutors from '../lib/useSavedTutors'
import { DAYS, firstName, formatDate, formatMoney, modeLabel } from '../lib/format'

function Stat({ value, label }) {
  return (
    <div>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function TutorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [hiring, setHiring] = useState(false)
  const [notice, setNotice] = useState('')
  const { savedIds, toggleSaved, canSave } = useSavedTutors()

  useEffect(() => {
    api.get(`/tutor/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(errorMessage(err, 'Tutor not found')))
  }, [id])

  if (error) return <div className="page"><div className="glass-card empty">{error}</div></div>
  if (!data) return <div className="page"><p className="muted">Loading profile...</p></div>

  const { tutor, workHistory } = data
  const { stats } = tutor
  const isOwnProfile = user && String(tutor.user._id) === String(user.id)
  const canBook = !user || user.role === 'student'

  const requireLogin = action => () => (user ? action() : navigate('/login', { state: { from: `/tutors/${id}` } }))
  const message = requireLogin(async () => {
    if (user && user.emailVerified === false) {
      setNotice(
        <span>
          Please verify your email address to message tutors.{' '}
          <Link to={`/verify-email?email=${encodeURIComponent(user.email || '')}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
            Verify your email
          </Link>
        </span>
      )
      return
    }
    try {
      navigate(await conversationPath(tutor.user._id))
    } catch (err) {
      if (isUnverifiedError(err)) {
        setNotice(
          <span>
            Please verify your email address to message tutors.{' '}
            <Link to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
              Verify your email
            </Link>
          </span>
        )
      } else {
        setNotice(errorMessage(err))
      }
    }
  })

  const slotsByDay = DAYS.map((day, index) => ({ day, slots: tutor.availability.filter(s => s.day === index) }))
    .filter(d => d.slots.length > 0)

  return (
    <div className="page">
      {notice && <div className="glass-card card success-text" style={{ marginBottom: '20px' }}>{notice}</div>}

      <div className="profile-layout">
        <div className="stack">
          <div className="glass-card card">
            <div className="row" style={{ gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Avatar path={tutor.profilePictureUrl} name={tutor.user.name} className="avatar-lg" />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '2rem' }}>{tutor.user.name}</h1>
                {tutor.headline && <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '1.05rem' }}>{tutor.headline}</p>}
                <TutorBadges tutor={tutor} />
                <p className="muted small" style={{ margin: '8px 0 0' }}>
                  {tutor.location && <><Icon name="pin" size={14} /> {tutor.location} · </>}
                  {tutor.languages.length > 0 && <><Icon name="languages" size={14} /> {tutor.languages.join(', ')} · </>}
                  Member since {formatDate(tutor.createdAt)}
                </p>
              </div>
            </div>

            <div className="stat-grid" style={{ marginTop: '24px', marginBottom: 0 }}>
              <Stat value={stats.jobSuccessScore != null ? `${stats.jobSuccessScore}%` : '—'} label="Job Success" />
              <Stat value={stats.completedSessions} label="Sessions completed" />
              <Stat value={stats.totalStudents} label="Students taught" />
              <Stat value={stats.repeatStudents} label="Repeat students" />
            </div>
          </div>

          <div className="glass-card card">
            <h3>About</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{tutor.bio}</p>
            <h4 style={{ marginBottom: '8px' }}>Subjects</h4>
            <div>{tutor.subjects.map(s => <span key={s} className="subject-tag">{s}</span>)}</div>
            <h4 style={{ marginBottom: '4px' }}>Education</h4>
            <p style={{ marginTop: 0 }}>{tutor.education}</p>
            {tutor.cvUrl && (
              <a href={fileUrl(tutor.cvUrl)} target="_blank" rel="noreferrer" className="success-text" style={{ fontWeight: 600 }}><Icon name="file" size={16} /> View CV / qualifications</a>
            )}
          </div>

          <div className="glass-card card">
            <div className="row-between">
              <h3 style={{ margin: 0 }}>Work history</h3>
              <StarRating value={stats.averageRating} count={stats.reviewCount} />
            </div>
            <p className="muted small">Generated automatically from completed sessions on LAMIF.</p>
            {workHistory.length === 0 ? (
              <p className="muted">No completed sessions yet.</p>
            ) : workHistory.map(item => (
              <div key={item.id} className="history-item">
                <div className="row-between">
                  <strong>{item.subject} <span className="muted small">· {modeLabel(item.mode)}</span></strong>
                  <span className="muted small">{formatDate(item.date)}</span>
                </div>
                {item.rating != null ? (
                  <>
                    <div className="row" style={{ gap: '8px', margin: '4px 0' }}>
                      <span className="stars">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>
                      <span className="muted small">by {item.studentName}</span>
                    </div>
                    {item.comment && <p style={{ margin: '4px 0' }}>"{item.comment}"</p>}
                    {item.tutorReply && <div className="reply"><strong>{firstName(tutor.user.name)}'s reply:</strong> {item.tutorReply}</div>}
                  </>
                ) : (
                  <p className="muted small" style={{ margin: '4px 0' }}>Completed with {item.studentName} · no feedback given</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="stack">
          <div className="glass-card card">
            {tutor.teachingModes.includes('online') && (
              <div className="row-between"><span>Online</span><strong className="tutor-rate" style={{ margin: '4px 0' }}>{formatMoney(tutor.hourlyRateOnline)}/hr</strong></div>
            )}
            {tutor.teachingModes.includes('in_person') && (
              <div className="row-between"><span>In person</span><strong className="tutor-rate" style={{ margin: '4px 0' }}>{formatMoney(tutor.hourlyRateInPerson)}/hr</strong></div>
            )}
            <div className="stack" style={{ gap: '10px', marginTop: '16px' }}>
              {isOwnProfile ? (
                <Link to="/profile/edit" className="btn-primary btn-sm" style={{ textAlign: 'center', textDecoration: 'none' }}>Edit profile</Link>
              ) : canBook && (
                <>
                  <button className="btn-primary btn-sm" onClick={requireLogin(() => setHiring(true))} disabled={tutor.availabilityStatus === 'fully_booked' || tutor.availabilityStatus === 'unavailable'}>
                    {tutor.availabilityStatus === 'fully_booked' ? 'Fully booked' : 'Book a session'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={message}>Message {firstName(tutor.user.name)}</button>
                  {canSave && (
                    <button className="btn-ghost btn-sm" onClick={() => toggleSaved(tutor._id)}>
                      <Icon name="heart" size={16} fill={savedIds.has(tutor._id) ? 'currentColor' : 'none'} /> {savedIds.has(tutor._id) ? 'Saved' : 'Save tutor'}
                    </button>
                  )}
                </>
              )}
            </div>
            {stats.activeStudents > 0 && (
              <p className="small muted" style={{ marginBottom: 0 }}>
                Working now with {stats.activeStudents} of {tutor.maxActiveStudents} student slots.
              </p>
            )}
          </div>

          <div className="glass-card card">
            <h4 style={{ marginTop: 0 }}>Weekly availability</h4>
            {slotsByDay.length === 0 ? (
              <p className="muted small">No regular hours set. Message the tutor to arrange a time.</p>
            ) : (
              <>
                {slotsByDay.map(({ day, slots }) => (
                  <div key={day} className="row-between small" style={{ padding: '4px 0' }}>
                    <strong>{day}</strong>
                    <span>{slots.map(s => `${s.start}–${s.end}`).join(', ')}</span>
                  </div>
                ))}
                <p className="muted small" style={{ marginBottom: 0 }}>Times are in Addis Ababa time (EAT).</p>
              </>
            )}
          </div>
        </aside>
      </div>

      {hiring && (
        <HireModal
          tutor={tutor}
          onClose={() => setHiring(false)}
          onDone={() => {
            setHiring(false)
            setNotice('Request sent! Track it on your dashboard.')
          }}
        />
      )}
    </div>
  )
}

export default TutorProfile
