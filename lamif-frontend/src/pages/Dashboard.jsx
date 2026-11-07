import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BookingCard from '../components/BookingCard'
import ReviewModal from '../components/ReviewModal'
import TutorBadges from '../components/TutorBadges'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { firstName, formatMoney, statusLabel, levelLabel, modeLabel } from '../lib/format'
import { useLanguage } from '../lib/LanguageContext'

const OPEN = ['requested', 'pending']
const ACTIVE = ['accepted', 'paid', 'in_progress']
const DONE = ['completed', 'reviewed']

const TABS = {
  student: [
    ['active', 'Upcoming & active', b => [...OPEN, ...ACTIVE].includes(b.status)],
    ['review', 'To review', b => b.status === 'completed'],
    ['history', 'History', b => [...DONE, 'cancelled', 'rejected'].includes(b.status)]
  ],
  tutor: [
    ['requests', 'New requests', b => OPEN.includes(b.status)],
    ['active', 'Active contracts', b => ACTIVE.includes(b.status)],
    ['history', 'History', b => [...DONE, 'cancelled', 'rejected'].includes(b.status)]
  ]
}

const sum = list => list.reduce((total, b) => total + (b.price || 0), 0)

function StatTile({ value, label }) {
  return (
    <div className="glass-card stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function Dashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [bookings, setBookings] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [profile, setProfile] = useState(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chosenTab, setChosenTab] = useState(null)
  const [reviewing, setReviewing] = useState(null)

  const load = useCallback(async () => {
    try {
      if (user.role === 'tutor') {
        const [bookingRes, profileRes, assignedRes] = await Promise.all([
          api.get('/booking/tutor-bookings'),
          api.get('/tutor/me'),
          api.get('/jobs/assigned-to-me').catch(() => ({ data: { jobs: [] } }))
        ])
        setBookings(bookingRes.data.bookings)
        setProfile(profileRes.data.tutor)
        setMyRequests(assignedRes.data.jobs || [])
      } else {
        const [bookingRes, requestRes] = await Promise.all([
          api.get('/booking/my-bookings'),
          api.get('/jobs/mine').catch(() => ({ data: { jobs: [] } }))
        ])
        setBookings(bookingRes.data.bookings)
        setMyRequests(requestRes.data.jobs || [])
      }
    } catch (err) {
      if (err.response?.status === 404) setNeedsProfile(true)
    } finally {
      setLoading(false)
    }
  }, [user.role])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="page"><p className="muted">Loading your dashboard...</p></div>

  if (needsProfile) {
    return (
      <div className="page">
        <div className="glass-card card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h1>Welcome to LAMIF, {firstName(user.name)}!</h1>
          <p className="muted" style={{ maxWidth: '520px', margin: '0 auto 24px' }}>Create your tutor profile to appear in search, receive booking requests and send proposals on tutoring jobs.</p>
          <button className="btn-primary" onClick={() => navigate('/profile/edit')}>Create tutor profile</button>
        </div>
      </div>
    )
  }

  const tabs = user.role === 'tutor' ? [
    ['requests', t('dash.tab.requests'), b => OPEN.includes(b.status)],
    ['active', t('dash.tab.contracts'), b => ACTIVE.includes(b.status)],
    ['history', t('dash.tab.history'), b => [...DONE, 'cancelled', 'rejected'].includes(b.status)]
  ] : [
    ['active', t('dash.tab.upcoming'), b => [...OPEN, ...ACTIVE].includes(b.status)],
    ['review', t('dash.tab.toReview'), b => b.status === 'completed'],
    ['history', t('dash.tab.history'), b => [...DONE, 'cancelled', 'rejected'].includes(b.status)]
  ]

  const tab = chosenTab || (tabs.find(([, , filter]) => bookings.some(filter)) || tabs[0])[0]
  const visible = bookings.filter(tabs.find(([key]) => key === tab)[2])
  const countFor = filter => bookings.filter(filter).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{user.role === 'tutor' ? t('dash.tutorPortal') : t('dash.studentPortal')}</p>
          <h1>{t('dash.welcome')} {firstName(user.name)}!</h1>
        </div>
        <div className="row">
          {user.role === 'student' ? (
            <>
              <button className="btn-ghost btn-sm" onClick={() => navigate('/jobs/new')}>{t('dash.postJob')}</button>
              <button className="btn-primary btn-sm" onClick={() => navigate('/browse-tutors')}>{t('dash.findTutors')}</button>
            </>
          ) : (
            <>
              <Link className="btn-ghost btn-sm" style={{ textDecoration: 'none' }} to={`/tutors/${profile._id}`}>{t('dash.viewPublicProfile')}</Link>
              <button className="btn-primary btn-sm" onClick={() => navigate('/jobs')}>{t('dash.findWork')}</button>
            </>
          )}
        </div>
      </div>

      {user && user.emailVerified === false && (
        <div className="glass-card card" style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid #eab308', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ display: 'block', color: 'var(--text-main)' }}>{t('dash.verifyNoticeTitle')}</strong>
            <span className="muted small">{t('dash.verifyNoticeDesc')}</span>
          </div>
          <Link to={`/verify-email?email=${encodeURIComponent(user.email || '')}`} className="btn-primary btn-sm">
            {t('dash.verifyNow')}
          </Link>
        </div>
      )}

      {user.role === 'tutor' ? (
        <>
          <div className="glass-card card" style={{
            marginBottom: '20px',
            borderLeft: profile.verificationStatus === 'approved' ? '4px solid #10b981'
              : profile.verificationStatus === 'needs_changes' ? '4px solid #f97316'
              : profile.verificationStatus === 'rejected' ? '4px solid #ef4444' : '4px solid #3b82f6'
          }}>
            <div className="row-between" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                <TutorBadges tutor={profile} />
                <div>
                  <span className={`status-badge status-${profile.verificationStatus}`}>
                    {statusLabel(profile.verificationStatus)}
                  </span>
                  <div className="small muted" style={{ marginTop: '4px' }}>
                    {profile.verificationStatus === 'draft' && 'Your application is currently saved as a draft.'}
                    {['submitted', 'pending'].includes(profile.verificationStatus) && 'Your application is submitted and queued for administrator review.'}
                    {profile.verificationStatus === 'under_review' && 'Your application is currently under review by our admin team.'}
                    {profile.verificationStatus === 'needs_changes' && `Revisions requested: "${profile.adminFeedback?.note || 'Please update your application details.'}"`}
                    {profile.verificationStatus === 'approved' && 'Verified profile active. You are eligible to receive bookings and apply to jobs.'}
                    {profile.verificationStatus === 'rejected' && `Application not approved: "${profile.adminFeedback?.rejectionReason || 'Review requirements not met.'}"`}
                  </div>
                </div>
              </div>
              <Link to="/profile/edit" className="btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                {profile.verificationStatus === 'approved' ? 'Edit Profile' : profile.verificationStatus === 'needs_changes' ? 'Update & Resubmit' : profile.verificationStatus === 'rejected' ? 'View Details' : 'Continue Application'}
              </Link>
            </div>
          </div>
          <div className="stat-grid">
            <StatTile value={formatMoney(sum(bookings.filter(b => DONE.includes(b.status))))} label={t('dash.earnedCompleted')} />
            <StatTile value={formatMoney(sum(bookings.filter(b => ACTIVE.includes(b.status))))} label={t('dash.activeContracts')} />
            <StatTile value={profile.stats.jobSuccessScore != null ? `${profile.stats.jobSuccessScore}%` : '—'} label={t('dash.jobSuccess')} />
            <StatTile value={profile.stats.averageRating != null ? `${profile.stats.averageRating} ★` : '—'} label={`${t('stats.rating')} (${profile.stats.reviewCount})`} />
            <StatTile value={`${profile.stats.activeStudents}/${profile.maxActiveStudents}`} label={t('dash.activeStudents')} />
          </div>
        </>
      ) : (
        <div className="stat-grid">
          <StatTile value={countFor(b => ACTIVE.includes(b.status))} label={t('dash.activeBookings')} />
          <StatTile value={countFor(b => OPEN.includes(b.status))} label={t('dash.awaitingTutor')} />
          <StatTile value={countFor(b => DONE.includes(b.status))} label={t('dash.sessionsCompleted')} />
          <StatTile value={formatMoney(sum(bookings.filter(b => [...DONE, 'paid', 'in_progress'].includes(b.status))))} label={t('dash.totalSpent')} />
        </div>
      )}

      {/* Student Tutoring Requests Section */}
      {user.role === 'student' && myRequests.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div className="row-between" style={{ alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>My Tutoring Requests</h3>
            <Link to="/jobs/new" className="btn-secondary btn-sm">+ Request Another Tutor</Link>
          </div>
          <div className="stack" style={{ gap: '10px' }}>
            {myRequests.map(req => (
              <div key={req._id} className="glass-card card" style={{ padding: '16px 20px' }}>
                <div className="row-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{req.title}</strong>
                      <span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span>
                    </div>
                    <div className="muted small" style={{ marginTop: '4px' }}>
                      Subject: <strong>{req.subject}</strong> · Grade: <strong>{levelLabel(req.level)}</strong> · Format: {modeLabel(req.mode)} {req.location ? `· ${req.location}` : ''}
                    </div>
                    {req.assignedTutor && (
                      <div className="success-text small" style={{ marginTop: '6px', fontWeight: 600 }}>
                        ✓ Assigned Educator: {req.assignedTutor.user?.name}
                      </div>
                    )}
                  </div>
                  <Link to={`/jobs/${req._id}`} className="btn-primary btn-sm">
                    View Status
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tutor Assigned Requests Section */}
      {user.role === 'tutor' && myRequests.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div className="row-between" style={{ alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Assigned Student Inquiries</h3>
            <span className="small muted">Tutoring requests matched to you by LAMIF</span>
          </div>
          <div className="stack" style={{ gap: '10px' }}>
            {myRequests.map(req => (
              <div key={req._id} className="glass-card card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
                <div className="row-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{req.title}</strong>
                      <span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span>
                    </div>
                    <div className="muted small" style={{ marginTop: '4px' }}>
                      Student: <strong>{req.studentName || req.student?.name}</strong> · Subject: <strong>{req.subject}</strong> · Format: {modeLabel(req.mode)} {req.location ? `· ${req.location}` : ''}
                    </div>
                    {req.preferredSchedule && (
                      <div className="small muted" style={{ marginTop: '4px' }}>
                        Schedule: {req.preferredSchedule}
                      </div>
                    )}
                  </div>
                  <Link to={`/jobs/${req._id}`} className="btn-primary btn-sm">
                    View Student Request
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tabs">
        {tabs.map(([key, label, filter]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setChosenTab(key)}>
            {label} ({countFor(filter)})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass-card empty">
          {user.role === 'student'
            ? <p>{t('dash.emptyStudent')} <Link className="success-text" to="/browse-tutors">{t('dash.findTutors')}</Link> or <Link className="success-text" to="/jobs/new">{t('dash.postJob')}</Link>.</p>
            : <p>{t('dash.emptyTutor')} <Link className="success-text" to="/jobs">{t('dash.findWork')}</Link>.</p>}
        </div>
      ) : (
        <div className="grid-cards">
          {visible.map(booking => (
            <BookingCard key={booking._id} booking={booking} side={user.role} onChanged={load} onReview={setReviewing} />
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
