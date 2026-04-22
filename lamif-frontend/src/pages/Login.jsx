import { useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { t } = useTranslation()

  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/auth/login', formData)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      setMessage('Login successful!')
      window.location.href = '/dashboard'
    } catch (error) {
      setMessage(error.response.data.message)
    }
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <h2>{t('auth.loginTitle')}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder={t('auth.email')}
          value={formData.email}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder={t('auth.password')}
          value={formData.password}
          onChange={handleChange}
        />
        <button type="submit">{t('auth.loginButton')}</button>
      </form>
      {message && <p>{message}</p>}
      <p>{t('auth.noAccount')} <a href="/register">{t('auth.registerHere')}</a></p>
    </div>
  )
}

export default Login