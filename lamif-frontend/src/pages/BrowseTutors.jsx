import { useState, useEffect } from 'react'
import axios from 'axios'
import ThemeToggle from '../components/ThemeToggle'

function BrowseTutors() {
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [bookingForm, setBookingForm] = useState({ subject: '', message: '' })
  const [bookingMessage, setBookingMessage] = useState('')

  const handleHireClick = (tutorId) => {
    setSelectedTutor(tutorId)
    setBookingMessage('')
    setBookingForm({ subject: '', message: '' })
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/booking/hire',
        {
          tutorId: selectedTutor,
          subject: bookingForm.subject,
          message: bookingForm.message
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setBookingMessage('Booking request sent successfully!')
      setTimeout(() => setSelectedTutor(null), 2000)
    } catch (error) {
      console.error(error)
      setBookingMessage(error.response?.data?.message || 'Failed to send request')
    }
  }

  useEffect(() => {
    async function fetchTutors() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/tutor/all')
        setTutors(response.data.tutors)
        setLoading(false)
      } catch (error) {
        console.log(error)
        setLoading(false)
      }
    }
    fetchTutors()
  }, [])

  if (loading) return <div className="auth-container"><h2>Loading expert tutors...</h2></div>

  return (
    <div className="browse-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '3rem' }}>Find a Tutor</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={() => window.location.href='/dashboard'} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}>Dashboard</button>
        </div>
      </div>
      
      <div className="tutors-grid">
        {tutors.map((tutor) => (
          <div className="tutor-card glass-card" key={tutor._id}>
            <div className="tutor-image-container">
              <img 
                src={tutor.profilePictureUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${tutor.profilePictureUrl}` : 'https://images.unsplash.com/photo-1544717297-fa154da09f9d?q=80&w=400&auto=format&fit=crop'} 
                alt={tutor.user.name} 
              />
            </div>
            <h3>{tutor.user.name}</h3>
            <div style={{ marginBottom: '16px' }}>
              {tutor.subjects.map((subject, index) => (
                <span className="subject-tag" key={index}>
                  {subject}
                </span>
              ))}
            </div>
            <p className="tutor-rate">{tutor.hourlyRate} ETB / hr</p>
            <p style={{ minHeight: '80px' }}>{tutor.bio}</p>
            
            <div style={{ marginTop: 'auto' }}>
              {tutor.cvUrl && (
                <a 
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${tutor.cvUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ display: 'block', marginBottom: '15px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}
                >
                  📄 View Qualifications
                </a>
              )}
              <button className="btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '12px' }} onClick={() => handleHireClick(tutor._id)}>
                Hire {tutor.user.name.split(' ')[0]}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hire Modal */}
      {selectedTutor && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '450px', background: 'var(--bg-dark)' }}>
            <h3 style={{ marginBottom: '20px' }}>Send Hiring Request</h3>
            {bookingMessage && <p style={{ color: bookingMessage.includes('success') ? 'var(--primary)' : '#ef4444', marginBottom: '15px', textAlign: 'center' }}>{bookingMessage}</p>}
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <input 
                type="text" 
                placeholder="Subject to learn..." 
                required 
                value={bookingForm.subject}
                onChange={e => setBookingForm({...bookingForm, subject: e.target.value})}
              />
              <textarea 
                placeholder="Details about your needs..." 
                required
                rows="4"
                value={bookingForm.message}
                onChange={e => setBookingForm({...bookingForm, message: e.target.value})}
                style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', color: 'white', padding: '1rem', marginBottom: '1.5rem', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSelectedTutor(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowseTutors