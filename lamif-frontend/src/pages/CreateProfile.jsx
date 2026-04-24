import { useState } from 'react'
import axios from 'axios'

function CreateProfile() {
  const [formData, setFormData] = useState({
    bio: '',
    subjects: '',
    hourlyRate: '',
    education: ''
  })
  const [cvFile, setCvFile] = useState(null)
  const [profilePic, setProfilePic] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const submitData = new FormData()
      submitData.append('bio', formData.bio)
      submitData.append('subjects', formData.subjects)
      submitData.append('hourlyRate', Number(formData.hourlyRate))
      submitData.append('education', formData.education)
      
      if (cvFile) submitData.append('cv', cvFile)
      if (profilePic) submitData.append('profilePicture', profilePic)
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/tutor/profile',
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      setMessage('Profile created successfully!')
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error creating profile:', error)
      const errorMessage = error.response?.data?.message || 'Failed to connect to server. Please try again.'
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '500px' }}>
        <h2>Complete Your Tutor Profile</h2>
        <form onSubmit={handleSubmit} style={{ background: 'transparent', padding: 0, boxShadow: 'none', border: 'none' }}>
          <textarea
            name="bio"
            placeholder="Tell us about your teaching experience and style..."
            value={formData.bio}
            onChange={handleChange}
            style={{ height: '120px' }}
            required
          />
          <input
            type="text"
            name="subjects"
            placeholder="Subjects (e.g. Math, Physics, English)"
            value={formData.subjects}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="hourlyRate"
            placeholder="Hourly rate (ETB)"
            value={formData.hourlyRate}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="education"
            placeholder="Your highest degree or certification"
            value={formData.education}
            onChange={handleChange}
            required
          />
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Profile Photo (JPG/PNG)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePic(e.target.files[0])}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Upload CV (PDF/Doc)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files[0])}
              style={{ marginBottom: 0 }}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Profile...' : 'Create Professional Profile'}
          </button>
        </form>
        {message && <p style={{ marginTop: '20px', textAlign: 'center', color: message.includes('success') ? 'var(--primary)' : '#ef4444' }}>{message}</p>}
      </div>
    </div>
  )
}

export default CreateProfile