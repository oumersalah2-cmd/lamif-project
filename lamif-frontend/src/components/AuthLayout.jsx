import Logo from './Logo'
import GeodesicGlobe3D from './GeodesicGlobe3D'
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
        <div className="auth-3d-wrap" aria-hidden="true">
          <GeodesicGlobe3D className="auth-3d-globe" showShadow={false} speed={0.65} interactive={false} />
        </div>
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
      </aside>
      <main className="auth-container">
        <div className="auth-top">
          <span className="auth-mobile-logo"><Logo size={30} /></span>
          <ThemeToggle />
        </div>
        <div className="auth-panel">
          <div className="auth-mobile-3d-hero" aria-hidden="true">
            <GeodesicGlobe3D className="auth-mobile-3d-globe" showShadow={false} speed={0.7} interactive={false} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthLayout
