import Logo, { LogoMark } from './Logo'
import Icon from './Icon'
import ThemeToggle from './ThemeToggle'

const POINTS = [
  'Verified tutors with real, platform-generated reviews',
  'Online or in-person sessions, from Grade 1 to university',
  'Prices locked the moment you book',
  'Post a job and let tutors send you proposals'
]

// Split screen: brand story on the left, the form on the right
function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Logo size={36} />
        <div>
          <h2>Ethiopia's marketplace for learning.</h2>
          <ul>
            {POINTS.map(point => (
              <li key={point}><Icon name="check" size={18} />{point}</li>
            ))}
          </ul>
        </div>
        <p style={{ margin: 0, color: 'rgba(233, 244, 238, 0.6)', fontSize: '0.85rem' }}>© {new Date().getFullYear()} LAMIF Educational Platform</p>
        <LogoMark size={420} className="auth-globe" />
      </aside>
      <main className="auth-container">
        <div className="auth-top">
          <span className="auth-mobile-logo"><Logo size={30} /></span>
          <ThemeToggle />
        </div>
        <div className="auth-panel">{children}</div>
      </main>
    </div>
  )
}

export default AuthLayout
