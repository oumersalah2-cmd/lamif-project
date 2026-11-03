import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import api, { errorMessage } from '../lib/api'
import { saveSession } from '../lib/session'

function Login() {
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setNeedsVerification(false)
    setResendMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/auth/login', formData)
      saveSession(response.data.token, response.data.user)
      const home = response.data.user.role === 'admin' ? '/admin' : '/dashboard'
      window.location.href = location.state?.from || home
    } catch (error) {
      setMessage(errorMessage(error, 'Connection failed. Please check your internet.'))
      setNeedsVerification(error.response?.data?.code === 'EMAIL_NOT_VERIFIED')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendMessage('')
    try {
      await api.post('/auth/resend-verification', { email: formData.email.trim().toLowerCase() })
      setResendMessage('Verification email sent. Check your inbox.')
    } catch (error) {
      setMessage(errorMessage(error, 'Could not resend verification email. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout>
      <h1>Welcome back</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: '28px' }}>Log in to continue learning and teaching on <span className="brand-stylish">LAMIF</span>.</p>
      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <label className="field-label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          name="password"
          placeholder="Your password"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      {message && <p className="error-text" style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
      {needsVerification && (
        <button
          type="button"
          className="btn-ghost"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>
      )}
      {resendMessage && <p className="success-text" style={{ marginTop: '1rem', textAlign: 'center' }}>{resendMessage}</p>}
      <p className="muted" style={{ marginTop: '2rem', textAlign: 'center' }}>
        New to <span className="brand-stylish">LAMIF</span>? <Link to="/register" className="success-text" style={{ fontWeight: 600 }}>Join <span className="brand-stylish">LAMIF</span></Link>
      </p>
    </AuthLayout>
  )
}

export default Login
