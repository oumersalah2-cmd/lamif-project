import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Icon from '../components/Icon'
import api, { errorMessage } from '../lib/api'
import { useLanguage } from '../lib/LanguageContext'

function Register() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: location.state?.role || 'student'
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const roles = [
    {
      role: 'student',
      icon: 'cap',
      title: t('auth.studentRole'),
      text: t('auth.studentRoleDesc')
    },
    {
      role: 'tutor',
      icon: 'briefcase',
      title: t('auth.tutorRole'),
      text: t('auth.tutorRoleDesc')
    }
  ]

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
      setRegistered(true)
      navigate(`/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&registered=true`)
    } catch (error) {
      setMessage(errorMessage(error, 'Connection failed.'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1>{t('auth.joinTitle')}</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: '24px' }}>
        {t('auth.joinSubtitle')}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="row" style={{ flexWrap: 'nowrap', marginBottom: '20px' }} role="radiogroup" aria-label="Account type">
          {roles.map(option => (
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

        <label className="field-label" htmlFor="reg-name">{t('auth.fullName')}</label>
        <input
          id="reg-name"
          type="text"
          name="name"
          placeholder="Abebe Kebede"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <label className="field-label" htmlFor="reg-email">{t('auth.email')}</label>
        <input
          id="reg-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label className="field-label" htmlFor="reg-password">{t('auth.password')}</label>
        <input
          id="reg-password"
          type="password"
          name="password"
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={6}
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading || registered}>
          {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
        </button>
      </form>

      {message && <p className={registered ? 'success-text' : 'error-text'} style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}

      <p className="muted" style={{ marginTop: '2rem', textAlign: 'center' }}>
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="success-text" style={{ fontWeight: 600 }}>
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Register
