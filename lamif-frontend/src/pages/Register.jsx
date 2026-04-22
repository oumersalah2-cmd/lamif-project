import { useState, useEffect } from 'react'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'

function Register() {
  const location = useLocation()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: location.state?.role || 'student'
  })

  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', formData)
      setMessage(response.data.message)
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
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
      <h2>{t('auth.registerTitle')}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder={t('auth.fullName')}
          value={formData.name}
          onChange={handleChange}
        />
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
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-main)' }}>{t('auth.joinAs')}</p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div 
              onClick={() => setFormData({...formData, role: 'student'})}
              style={{
                flex: 1, padding: '20px', border: `2px solid ${formData.role === 'student' ? 'var(--primary-color)' : 'var(--border-color)'}`, 
                borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.role === 'student' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main)'
              }}>
              <h4 style={{ color: formData.role === 'student' ? 'var(--primary-color)' : 'var(--text-main)' }}>🎓 {t('auth.student')}</h4>
              <p style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-muted)' }}>{t('auth.wantToFind')}</p>
            </div>
            
            <div 
              onClick={() => setFormData({...formData, role: 'tutor'})}
              style={{
                flex: 1, padding: '20px', border: `2px solid ${formData.role === 'tutor' ? 'var(--primary-color)' : 'var(--border-color)'}`, 
                borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: formData.role === 'tutor' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main)'
              }}>
              <h4 style={{ color: formData.role === 'tutor' ? 'var(--primary-color)' : 'var(--text-main)' }}>💼 {t('auth.tutor')}</h4>
              <p style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-muted)' }}>{t('auth.wantToTeach')}</p>
            </div>
          </div>
        </div>
        <button type="submit">{t('auth.registerButton')} {formData.role === 'tutor' ? t('auth.tutor') : t('auth.student')}</button>
      </form>
      {message && <p>{message}</p>}
      <p>{t('auth.haveAccount')} <a href="/login">{t('auth.loginHere')}</a></p>
    </div>
  )
}

export default Register