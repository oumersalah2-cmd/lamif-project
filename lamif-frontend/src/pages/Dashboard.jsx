import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BookingCard from '../components/BookingCard'
import ReviewModal from '../components/ReviewModal'
import TutorBadges from '../components/TutorBadges'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { firstName, formatMoney } from '../lib/format'

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

  const tabs = TABS[user.role]
  const tab = chosenTab || (tabs.find(([, , filter]) => bookings.some(filter)) || tabs[0])[0]
  const visible = bookings.filter(tabs.find(([key]) => key === tab)[2])
  const countFor = filter => bookings.filter(filter).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{user.role === 'tutor' ? 'Tutor dashboard' : 'Student dashboard'}</p>
          <h1>Welcome back, {firstName(user.name)}!</h1>
        </div>
        <div className="row">
          {user.role === 'student' ? (
            <>
              <button className="btn-ghost btn-sm" onClick={() => navigate('/jobs/new')}>Post a job</button>
              <button className="btn-primary btn-sm" onClick={() => navigate('/browse-tutors')}>Find tutors</button>
            </>
          ) : (
            <>
              <Link className="btn-ghost btn-sm" style={{ textDecoration: 'none' }} to={`/tutors/${profile._id}`}>View public profile</Link>
              <button className="btn-primary btn-sm" onClick={() => navigate('/jobs')}>Find work</button>
            </>
          )}
        </div>
      </div>

      {user.role === 'tutor' ? (
        <>
          <div className="glass-card card row-between" style={{ marginBottom: '20px' }}>
            <TutorBadges tutor={profile} />
            <span className="small muted">Profile: {profile.verificationStatus === 'approved' ? 'Verified' : profile.verificationStatus === 'pending' ? 'Pending verification' : 'Not approved'}</span>
          </div>
          <div className="stat-grid">
            <StatTile value={formatMoney(sum(bookings.filter(b => DONE.includes(b.status))))} label="Earned (completed)" />
            <StatTile value={formatMoney(sum(bookings.filter(b => ACTIVE.includes(b.status))))} label="In active contracts" />
            <StatTile value={profile.stats.jobSuccessScore != null ? `${profile.stats.jobSuccessScore}%` : '—'} label="Job Success Score" />
            <StatTile value={profile.stats.averageRating != null ? `${profile.stats.averageRating} ★` : '—'} label={`Rating (${profile.stats.reviewCount} reviews)`} />
            <StatTile value={`${profile.stats.activeStudents}/${profile.maxActiveStudents}`} label="Active students" />
          </div>
        </>
      ) : (
        <div className="stat-grid">
          <StatTile value={countFor(b => ACTIVE.includes(b.status))} label="Active bookings" />
          <StatTile value={countFor(b => OPEN.includes(b.status))} label="Awaiting tutor" />
          <StatTile value={countFor(b => DONE.includes(b.status))} label="Sessions completed" />
          <StatTile value={formatMoney(sum(bookings.filter(b => [...DONE, 'paid', 'in_progress'].includes(b.status))))} label="Total spent" />
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
            ? <p>Nothing here yet. <Link className="success-text" to="/browse-tutors">Find a tutor</Link> or <Link className="success-text" to="/jobs/new">post a job</Link> and let tutors come to you.</p>
            : <p>Nothing here yet. Keep your profile and availability up to date, and <Link className="success-text" to="/jobs">browse open jobs</Link>.</p>}
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
