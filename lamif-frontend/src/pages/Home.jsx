import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import axios from 'axios'

function Home() {
  const navigate = useNavigate()
  const [featuredTutors, setFeaturedTutors] = useState([])

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/tutor/all')
        if (response.data && response.data.tutors) {
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
        <h2 className="brand-logo">LAMIF PLATFORM</h2>
        <div className="nav-links">
          <ThemeToggle />
          <button onClick={() => navigate('/login')}>Login</button>
          <button onClick={() => navigate('/register')} style={{ background: 'var(--primary)', border: 'none' }}>Join Now</button>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
            <h1>Find the Perfect Tutor for Your Studies</h1>
            <p>Connect with qualified tutors across Ethiopia. Expert guidance in Science, Arts, Languages, and more. Learn faster, achieve more.</p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/register', { state: { role: 'student' } })} className="btn-primary">
                Find a Tutor
              </button>
              <button onClick={() => navigate('/register', { state: { role: 'tutor' } })} className="btn-secondary">
                Become a Tutor
              </button>
            </div>
        </div>
      </div>

      <div className="features-section">
        <div className="feature-card glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎓</div>
          <h3>Qualified Tutors</h3>
          <p>Every tutor is vetted and verified to ensure the highest quality of education for our students.</p>
        </div>
        <div className="feature-card glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3>Secure Platform</h3>
          <p>Your data and communications are encrypted and secure. Focus on learning with peace of mind.</p>
        </div>
        <div className="feature-card glass-card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
          <h3>Any Subject</h3>
          <p>From Mathematics to Amharic, find experts in any field to help you master your curriculum.</p>
        </div>
      </div>

      {featuredTutors.length > 0 && (
        <div className="browse-container" style={{ paddingTop: '0' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '60px', fontSize: '3rem' }}>Expert Tutors</h2>
          <div className="tutors-grid">
            {featuredTutors.map((tutor) => (
              <div key={tutor._id} className="tutor-card glass-card">
                <div className="tutor-image-container">
                  <img 
                    src={tutor.profilePictureUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${tutor.profilePictureUrl}` : 'https://images.unsplash.com/photo-1544717297-fa154da09f9d?q=80&w=400&auto=format&fit=crop'} 
                    alt={tutor.user?.name} 
                  />
                </div>
                <h3>{tutor.user?.name}</h3>
                <div style={{ marginBottom: '16px' }}>
                  {tutor.subjects.map((sub, index) => (
                    <span key={index} className="subject-tag">{sub}</span>
                  ))}
                </div>
                <p className="tutor-rate">{tutor.hourlyRate} ETB / hr</p>
                <p>{tutor.bio ? tutor.bio.substring(0, 100) + '...' : 'Professional tutor dedicated to student success and academic excellence.'}</p>
                <button onClick={() => navigate('/login')}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
             <button onClick={() => navigate('/login')} className="btn-secondary">Explore All Tutors</button>
          </div>
        </div>
      )}

      <footer style={{ padding: '80px 5% 40px', textAlign: 'center', borderTop: '1px solid var(--border-glass)', marginTop: '80px' }}>
         <p style={{ color: 'var(--text-muted)' }}>© 2026 LAMIF Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Home