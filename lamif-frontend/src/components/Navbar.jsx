import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import Logo from './Logo'
import Icon from './Icon'
import api from '../lib/api'
import { getUser, clearSession } from '../lib/session'
import { useLanguage } from '../lib/LanguageContext'

const LINK_KEYS = {
  guest: [
    { to: '/browse-tutors', key: 'nav.findTutors' },
    { to: '/jobs', key: 'nav.tutoringJobs' }
  ],
  student: [
    { to: '/dashboard', key: 'nav.dashboard' },
    { to: '/browse-tutors', key: 'nav.findTutors' },
    { to: '/jobs', key: 'nav.myJobs' },
    { to: '/saved', key: 'nav.saved' }
  ],
  tutor: [
    { to: '/dashboard', key: 'nav.dashboard' },
    { to: '/jobs', key: 'nav.findWork' },
    { to: '/proposals', key: 'nav.proposals' },
    { to: '/profile/edit', key: 'nav.myProfile' }
  ],
  admin: [
    { to: '/admin', key: 'nav.admin' },
    { to: '/browse-tutors', key: 'nav.findTutors' }
  ]
}

const SUMMARY_POLL_MS = 30000

function Navbar() {
  const navigate = useNavigate()
  const user = getUser()
  const { t } = useLanguage()
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

  const currentLinks = LINK_KEYS[user?.role || 'guest'] || LINK_KEYS.guest

  return (
    <nav className="app-nav">
      <Logo to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} />

      <div className={`nav-menu ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
        {currentLinks.map(link => (
          <NavLink key={link.to} to={link.to} className="nav-link">{t(link.key)}</NavLink>
        ))}
        {user && (
          <>
            <span className="nav-divider" />
            <NavLink to="/messages" className="nav-link" title={t('nav.messages')}>
              <Icon name="message" size={18} /> <span>{t('nav.messages')}</span>{count(summary.unreadMessages, 'inline')}
            </NavLink>
            <NavLink to="/notifications" className="nav-link" aria-label={t('nav.notifications')} title={t('nav.notifications')}>
              <Icon name="bell" size={18} />{count(summary.unreadNotifications)}
            </NavLink>
          </>
        )}
        {user ? (
          <button onClick={handleLogout} className="btn-ghost btn-sm" style={{ marginLeft: '6px' }}>
            {t('nav.signOut')}
          </button>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">{t('nav.logIn')}</NavLink>
            <button onClick={() => navigate('/register')} className="btn-primary btn-sm">
              {t('nav.joinNow')}
            </button>
          </>
        )}
      </div>

      <div className="nav-actions">
        <LanguageToggle />
        <ThemeToggle />
        <button className="nav-burger icon-btn" onClick={() => setMenuOpen(open => !open)} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
    </nav>
  )
}

export default Navbar
