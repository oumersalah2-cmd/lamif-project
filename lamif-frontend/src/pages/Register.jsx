import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Icon from '../components/Icon'
import api, { errorMessage } from '../lib/api'

const ROLES = [
  { role: 'student', icon: 'cap', title: 'I want to learn', text: 'Find tutors and post jobs' },
  { role: 'tutor', icon: 'briefcase', title: 'I want to teach', text: 'Get booked and earn' }
]

function Register() {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: location.state?.role || 'student'
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await api.post('/auth/register', formData)
      const token = res.data.verificationToken || ''
      const email = formData.email.trim()
      navigate(`/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&registered=true`)
    } catch (error) {
      setMessage(errorMessage(error, 'Connection failed.'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1>Join <span className="brand-stylish">LAMIF</span></h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: '24px' }}>Create your free account in under a minute.</p>
      <form onSubmit={handleSubmit}>
        <div className="row" style={{ flexWrap: 'nowrap', marginBottom: '20px' }} role="radiogroup" aria-label="Account type">
          {ROLES.map(option => (
            <button
              key={option.role}
              type="button"
              role="radio"
              aria-checked={formData.role === option.role}
              className={`role-option ${formData.role === option.role ? 'selected' : ''}`}
              onClick={() => setFormData({ ...formData, role: option.role })}
            >
              <Icon name={option.icon} size={22} />
              <strong>{option.title}</strong>
              <span>{option.text}</span>
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="reg-name">Full name</label>
        <input id="reg-name" type="text" name="name" placeholder="Abebe Kebede" autoComplete="name" value={formData.name} onChange={handleChange} required />
        <label className="field-label" htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" name="email" placeholder="you@example.com" autoComplete="email" value={formData.email} onChange={handleChange} required />
        <label className="field-label" htmlFor="reg-password">Password</label>
        <input id="reg-password" type="password" name="password" placeholder="At least 6 characters" autoComplete="new-password" minLength={6} value={formData.password} onChange={handleChange} required />
        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading || registered}>
          {loading ? 'Creating account...' : `Sign up as a ${formData.role}`}
        </button>
      </form>
      {message && <p className={registered ? 'success-text' : 'error-text'} style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
      <p className="muted" style={{ marginTop: '2rem', textAlign: 'center' }}>
        Already have an account? <Link to="/login" className="success-text" style={{ fontWeight: 600 }}>Log in</Link>
      </p>
    </AuthLayout>
  )
}

export default Register
