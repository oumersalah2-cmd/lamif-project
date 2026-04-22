import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="home-container">
      <nav className="home-nav">
        <h2 className="brand-logo">LAMIF EDUCATIONAL PLATFORM</h2>
        <div className="nav-links">
          <button onClick={() => navigate('/login')}>{t('nav.login')}</button>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="hero-section">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <div className="hero-buttons">
          <button onClick={() => navigate('/register', { state: { role: 'student' } })} className="btn-primary">
            {t('nav.findTutor')}
          </button>
          <button onClick={() => navigate('/register', { state: { role: 'tutor' } })} className="btn-secondary">
            {t('nav.becomeTutor')}
          </button>
        </div>
      </div>

      <div className="features-section">
        <div className="feature-card">
          <h3>{t('home.qualifiedTitle')}</h3>
          <p>{t('home.qualifiedDesc')}</p>
        </div>
        <div className="feature-card">
          <h3>{t('home.secureTitle')}</h3>
          <p>{t('home.secureDesc')}</p>
        </div>
        <div className="feature-card">
          <h3>{t('home.subjectTitle')}</h3>
          <p>{t('home.subjectDesc')}</p>
        </div>
      </div>
    </div>
  )
}

export default Home