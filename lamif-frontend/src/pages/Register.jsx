import { useState } from 'react'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

function Register() {
  const location = useLocation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: location.state?.role || 'student'
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/auth/register', formData)
      setMessage('Registration successful! Redirecting...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } catch (error) {
      console.error('Registration error:', error)
      setMessage(error.response?.data?.message || 'Connection failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>
      <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Join LAMIF</h2>
        <form onSubmit={handleSubmit} style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Create Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontWeight: '700', marginBottom: '1rem', color: 'var(--text-main)' }}>I want to join as a:</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div 
                onClick={() => setFormData({...formData, role: 'student'})}
                style={{
                  flex: 1, padding: '1.5rem', border: `2px solid ${formData.role === 'student' ? 'var(--primary)' : 'var(--border-glass)'}`, 
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center', background: formData.role === 'student' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.3)',
                  transition: 'all 0.2s'
                }}>
                <h4 style={{ color: formData.role === 'student' ? 'var(--primary)' : 'var(--text-main)', marginBottom: '5px' }}>🎓 Student</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>I want to find a tutor</p>
              </div>
              
              <div 
                onClick={() => setFormData({...formData, role: 'tutor'})}
                style={{
                  flex: 1, padding: '1.5rem', border: `2px solid ${formData.role === 'tutor' ? 'var(--primary)' : 'var(--border-glass)'}`, 
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center', background: formData.role === 'tutor' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.3)',
                  transition: 'all 0.2s'
                }}>
                <h4 style={{ color: formData.role === 'tutor' ? 'var(--primary)' : 'var(--text-main)', marginBottom: '5px' }}>💼 Tutor</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>I want to teach students</p>
              </div>
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : `Sign Up as ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`}
          </button>
        </form>
        {message && <p style={{ marginTop: '20px', textAlign: 'center', color: message.includes('successful') ? 'var(--primary)' : '#ef4444' }}>{message}</p>}
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</a>
        </p>
      </div>
    </div>
  )
}

export default Register