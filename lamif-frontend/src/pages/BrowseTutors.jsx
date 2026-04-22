import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'

function BrowseTutors() {
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [bookingForm, setBookingForm] = useState({ subject: '', message: '' })
  const [bookingMessage, setBookingMessage] = useState('')
  const { t } = useTranslation()

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

  if (loading) return <p>Loading tutors...</p>

  return (
    <div className="browse-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>{t('tutors.title')}</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="tutors-grid">
        {tutors.map((tutor) => (
          <div className="tutor-card" key={tutor._id}>
            <h3>{tutor.user.name}</h3>
            <p>{tutor.bio}</p>
            <div className="tutor-subjects">
              {tutor.subjects.map((subject, index) => (
                <span className="subject-tag" key={index}>
                  {subject}
                </span>
              ))}
            </div>
            <p className="tutor-rate">{tutor.hourlyRate} Birr / hr</p>
            <p className="tutor-education">{tutor.education}</p>
            {tutor.cvUrl && (
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + `${tutor.cvUrl}`} target="_blank" rel="noreferrer" style={{display: 'block', marginBottom: '10px', color: '#007bff'}}>
                {t('tutors.viewCv')}
              </a>
            )}
            <button onClick={() => handleHireClick(tutor._id)}>{t('tutors.hireButton')}</button>
          </div>
        ))}
      </div>

      {/* Hire Modal */}
      {selectedTutor && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '20px', borderRadius: '8px', 
            width: '90%', maxWidth: '400px', color: '#333'
          }}>
            <h3>{t('tutors.hireButton')}</h3>
            {bookingMessage && <p style={{ color: bookingMessage.includes('success') ? 'green' : 'red' }}>{bookingMessage}</p>}
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Subject (e.g. Math, Physics)" 
                required 
                value={bookingForm.subject}
                onChange={e => setBookingForm({...bookingForm, subject: e.target.value})}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <textarea 
                placeholder="Message to the tutor..." 
                required
                rows="4"
                value={bookingForm.message}
                onChange={e => setBookingForm({...bookingForm, message: e.target.value})}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSelectedTutor(null)} style={{ background: '#ccc', color: '#333' }}>Cancel</button>
                <button type="submit" style={{ background: '#007bff', color: 'white' }}>Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowseTutors