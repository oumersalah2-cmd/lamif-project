import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

function Dashboard() {
    const [user, setUser] = useState(null)
    const [bookings, setBookings] = useState([])
    const navigate = useNavigate()
    const { t } = useTranslation()

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            fetchBookings(parsedUser.role)
        } else {
            navigate('/login')
        }
    }, [])

    const fetchBookings = async (role) => {
        try {
            const token = localStorage.getItem('token')
            const endpoint = role === 'student' ? '/api/booking/my-bookings' : '/api/booking/tutor-bookings'
            const response = await axios.get(`http://localhost:5000${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setBookings(response.data.bookings)
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
        }
    }

    const handleUpdateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token')
            await axios.put(`http://localhost:5000/api/booking/status/${id}`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            // Refresh bookings
            fetchBookings(user.role)
        } catch (error) {
            console.error('Failed to update status:', error)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    if (!user) return <p>Loading...</p> 

    return (
        <div className="dashboard-container">
        <div className="dashboard-header">
        <h1>{t('dashboard.welcome')}, {user.name}!</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', margin: 0 }}>{t('nav.logout')}</button>
        </div>
        </div>


      {user.role === 'student' && (
        <div>
          <h2>{t('dashboard.studentDashboard')}</h2>
          <p>{t('dashboard.browseText')}</p>
          <button className="btn-primary" onClick={() => navigate('/browse-tutors')}>
            {t('dashboard.browseButton')}
          </button>

          <div style={{ marginTop: '30px' }}>
            <h3>{t('dashboard.myBookings')}</h3>
            {bookings.length === 0 ? <p>{t('dashboard.noBookings')}</p> : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {bookings.map(b => (
                  <div key={b._id} className="booking-card">
                    <p><strong>Tutor:</strong> {b.tutor?.user?.name || 'Unknown'}</p>
                    {b.status === 'accepted' && (
                        <p><strong>Tutor Email:</strong> <a href={`mailto:${b.tutor?.user?.email}`} style={{color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none'}}>{b.tutor?.user?.email}</a></p>
                    )}
                    <p><strong>Subject:</strong> {b.subject}</p>
                    <p><strong>Message:</strong> {b.message}</p>
                    <p><strong>Status:</strong> <span className={`status-badge status-${b.status}`}>
                        {t(`dashboard.status.${b.status}`)}
                    </span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div> 
      )}

      {user.role === 'tutor' && (
        <div>
          <h2>{t('dashboard.tutorDashboard')}</h2>
          <p>{t('dashboard.manageProfile')}</p>
          <button className="btn-primary" onClick={() => navigate('/create-profile')}>
            {t('dashboard.profileButton')}
          </button>

          <div style={{ marginTop: '30px' }}>
            <h3>{t('dashboard.incomingRequests')}</h3>
            {bookings.length === 0 ? <p>{t('dashboard.noRequests')}</p> : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {bookings.map(b => (
                  <div key={b._id} className="booking-card">
                    <p><strong>Student:</strong> {b.student?.name}</p>
                    <p><strong>Email:</strong> {b.student?.email}</p>
                    <p><strong>Subject:</strong> {b.subject}</p>
                    <p><strong>Message:</strong> {b.message}</p>
                    <p><strong>Status:</strong> <span className={`status-badge status-${b.status}`}>
                        {t(`dashboard.status.${b.status}`)}
                    </span></p>
                    
                    {b.status === 'pending' && (
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleUpdateStatus(b._id, 'accepted')} className="btn-primary" style={{ padding: '8px 24px', fontSize: '14px' }}>Accept</button>
                            <button onClick={() => handleUpdateStatus(b._id, 'rejected')} className="btn-secondary" style={{ padding: '8px 24px', fontSize: '14px', borderColor: '#ef4444', color: '#ef4444' }}>Reject</button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard