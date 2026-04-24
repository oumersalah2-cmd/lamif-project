import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function Dashboard() {
    const [user, setUser] = useState(null)
    const [bookings, setBookings] = useState([])
    const navigate = useNavigate()

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
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
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
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/booking/status/${id}`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            })
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

    if (!user) return <div className="auth-container"><h2>Loading your portal...</h2></div> 

    return (
        <div className="dashboard-container">
            <div className="dashboard-header glass-card" style={{ padding: '2rem', border: 'none', marginBottom: '3rem' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Personal Dashboard</p>
                    <h1 style={{ margin: 0 }}>Welcome back, {user.name}!</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <ThemeToggle />
                    <button onClick={handleLogout} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>Sign Out</button>
                </div>
            </div>

            {user.role === 'student' && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <div className="glass-card" style={{ padding: '3rem', marginBottom: '3rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Find Your Next Expert</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>Browse our selection of top-tier tutors and start your learning journey today.</p>
                        <button className="btn-primary" onClick={() => navigate('/browse-tutors')}>
                            Explore All Tutors
                        </button>
                    </div>

                    <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Your Booking History</h3>
                    {bookings.length === 0 ? (
                        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>You haven't booked any tutors yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                            {bookings.map(b => (
                                <div key={b._id} className="booking-card glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '1.2rem' }}>{b.tutor?.user?.name || 'Tutor Profile'}</h4>
                                        <span className={`status-badge status-${b.status}`}>{b.status}</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>Subject:</strong> {b.subject}</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>"{b.message}"</p>
                                    {b.status === 'accepted' && (
                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>TUTOR CONTACT:</p>
                                            <a href={`mailto:${b.tutor?.user?.email}`} style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem' }}>{b.tutor?.user?.email}</a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div> 
            )}

            {user.role === 'tutor' && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <div className="glass-card" style={{ padding: '3rem', marginBottom: '3rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Manage Your Presence</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>Keep your bio, subjects, and profile photo up to date to attract more students.</p>
                        <button className="btn-primary" onClick={() => navigate('/create-profile')}>
                            Update Tutor Profile
                        </button>
                    </div>

                    <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Incoming Requests</h3>
                    {bookings.length === 0 ? (
                        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No students have contacted you yet. Keep your profile updated!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                            {bookings.map(b => (
                                <div key={b._id} className="booking-card glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.2rem' }}>{b.student?.name}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.student?.email}</p>
                                        </div>
                                        <span className={`status-badge status-${b.status}`}>{b.status}</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>Subject:</strong> {b.subject}</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>"{b.message}"</p>
                                    
                                    {b.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => handleUpdateStatus(b._id, 'accepted')} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}>Accept</button>
                                            <button onClick={() => handleUpdateStatus(b._id, 'rejected')} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>Reject</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Dashboard