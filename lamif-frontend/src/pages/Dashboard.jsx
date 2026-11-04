import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BookingCard from '../components/BookingCard'
import ReviewModal from '../components/ReviewModal'
import TutorBadges from '../components/TutorBadges'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { firstName, formatMoney } from '../lib/format'
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
  const [profile, setProfile] = useState(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chosenTab, setChosenTab] = useState(null)
  const [reviewing, setReviewing] = useState(null)

  const load = useCallback(async () => {
    try {
      if (user.role === 'tutor') {
        const [bookingRes, profileRes] = await Promise.all([api.get('/booking/tutor-bookings'), api.get('/tutor/me')])
        setBookings(bookingRes.data.bookings)
        setProfile(profileRes.data.tutor)
      } else {
        const res = await api.get('/booking/my-bookings')
        setBookings(res.data.bookings)
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
            <strong style={{ display: 'block', color: 'var(--text)' }}>{t('dash.verifyNoticeTitle')}</strong>
            <span className="muted small">{t('dash.verifyNoticeDesc')}</span>
          </div>
          <Link to={`/verify-email?email=${encodeURIComponent(user.email || '')}`} className="btn-primary btn-sm">
            {t('dash.verifyNow')}
          </Link>
        </div>
      )}

      {user.role === 'tutor' ? (
        <>
          <div className="glass-card card row-between" style={{ marginBottom: '20px' }}>
            <TutorBadges tutor={profile} />
            <span className="small muted">Profile: {profile.verificationStatus === 'approved' ? 'Verified' : profile.verificationStatus === 'pending' ? 'Pending verification' : 'Not approved'}</span>
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
