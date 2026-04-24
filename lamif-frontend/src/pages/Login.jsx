import { useState } from 'react'
import axios from 'axios'
import ThemeToggle from '../components/ThemeToggle'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/auth/login', formData)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || 'Connection failed. Please check your internet.'
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>
      <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Welcome Back</h2>
        <form onSubmit={handleSubmit} style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
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
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        {message && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Don't have an account? <a href="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>Create one</a>
        </p>
      </div>
    </div>
  )
}

export default Login