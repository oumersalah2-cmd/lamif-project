import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import axios from 'axios'

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [featuredTutors, setFeaturedTutors] = useState([])

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/tutor/all')
        if (response.data && response.data.tutors) {
          // Shuffle and take top 3
          const shuffled = response.data.tutors.sort(() => 0.5 - Math.random())
          setFeaturedTutors(shuffled.slice(0, 3))
        }
      } catch (error) {
        console.error('Failed to fetch tutors for homepage:', error)
      }
    }
    fetchTutors()
  }, [])

  return (
    <div className="home-container">
      <nav className="home-nav">
        <h2 className="brand-logo">LAMIF EDUCATIONAL PLATFORM</h2>
        <div className="nav-links">
          <ThemeToggle />
          <button onClick={() => navigate('/login')}>{t('nav.login')}</button>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
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

      {featuredTutors.length > 0 && (
        <div className="browse-container" style={{ paddingTop: '0' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Meet Some of Our Tutors</h2>
          <div className="tutors-grid">
            {featuredTutors.map((tutor) => (
              <div key={tutor._id} className="tutor-card">
                <h3>{tutor.user?.name}</h3>
                <div style={{ marginBottom: '16px' }}>
                  {tutor.subjects.map((sub, index) => (
                    <span key={index} className="subject-tag">{sub}</span>
                  ))}
                </div>
                <p className="tutor-rate">{tutor.hourlyRate} Birr / hr</p>
                <p>{tutor.bio ? tutor.bio.substring(0, 100) + '...' : 'No bio available.'}</p>
                <button onClick={() => navigate('/register', { state: { role: 'student' } })}>
                  Hire {tutor.user?.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home