import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'
import Icon from './Icon'
import api from '../lib/api'
import { getUser, clearSession } from '../lib/session'

const LINKS = {
  guest: [
    { to: '/browse-tutors', label: 'Find Tutors' },
    { to: '/jobs', label: 'Tutoring Jobs' }
  ],
  student: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/browse-tutors', label: 'Find Tutors' },
    { to: '/jobs', label: 'My Jobs' },
    { to: '/saved', label: 'Saved' }
  ],
  tutor: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/jobs', label: 'Find Work' },
    { to: '/proposals', label: 'Proposals' },
    { to: '/profile/edit', label: 'My Profile' }
  ],
  admin: [
    { to: '/admin', label: 'Admin' },
    { to: '/browse-tutors', label: 'Tutors' }
  ]
}

const SUMMARY_POLL_MS = 30000

function Navbar() {
  const navigate = useNavigate()
  const user = getUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [summary, setSummary] = useState({ unreadNotifications: 0, unreadMessages: 0 })

  useEffect(() => {
    if (!user) return
    const load = () => api.get('/notifications/summary').then(res => setSummary(res.data)).catch(() => {})
    load()
    const timer = setInterval(load, SUMMARY_POLL_MS)
    return () => clearInterval(timer)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const count = (n, className = '') => (n > 0 ? <span className={`nav-count ${className}`}>{n > 99 ? '99+' : n}</span> : null)

  return (
    <nav className="app-nav">
      <Logo to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} />

      <div className={`nav-menu ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
        {LINKS[user?.role || 'guest'].map(link => (
          <NavLink key={link.to} to={link.to} className="nav-link">{link.label}</NavLink>
        ))}
        {user && (
          <>
            <span className="nav-divider" />
            <NavLink to="/messages" className="nav-link" title="Messages"><Icon name="message" size={18} /> <span>Messages</span>{count(summary.unreadMessages, 'inline')}</NavLink>
            <NavLink to="/notifications" className="nav-link" aria-label="Notifications" title="Notifications"><Icon name="bell" size={18} />{count(summary.unreadNotifications)}</NavLink>
          </>
        )}
        {user ? (
          <button onClick={handleLogout} className="btn-ghost btn-sm" style={{ marginLeft: '6px' }}>Sign out</button>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Log in</NavLink>
            <button onClick={() => navigate('/register')} className="btn-primary btn-sm">Join now</button>
          </>
        )}
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        <button className="nav-burger icon-btn" onClick={() => setMenuOpen(open => !open)} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
    </nav>
  )
}

export default Navbar
