import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Icon from '../components/Icon'
import api, { errorMessage } from '../lib/api'
import { getUser, saveSession } from '../lib/session'

function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialEmail =
    location.state?.email ||
    searchParams.get('email') ||
    getUser()?.email ||
    ''

  const isFromRegisterWithEmailSent = location.state?.emailSent === true
  const [email, setEmail] = useState(initialEmail)
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail)
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(isFromRegisterWithEmailSent ? 60 : 0)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState(
    location.state?.emailSent === false
      ? 'We created your account, but could not send the verification code. Please press "Resend code" below to try again.'
      : ''
  )
  const [success, setSuccess] = useState('')

  // 60-second countdown timer for resending
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleCodeChange = e => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(val)
    if (error) setError('')
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (!email) {
      setError('Please provide your email address.')
      return
    }
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await api.post('/auth/verify-email', { email, code })
      saveSession(res.data.token, res.data.user)
      setSuccess('Email verified successfully! Redirecting...')
      setTimeout(() => {
        const destination =
          location.state?.from ||
          (res.data.user?.role === 'admin' ? '/admin' : '/dashboard')
        navigate(destination, { replace: true })
      }, 1000)
    } catch (err) {
      setError(errorMessage(err, 'Failed to verify code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    if (!email) {
      setError('Please provide your email address first.')
      return
    }

    setResending(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/auth/resend-code', { email })
      setCountdown(60)
      setSuccess('A new 6-digit verification code has been sent to your email.')
    } catch (err) {
      setError(errorMessage(err, 'Could not resend code. Please try again later.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'var(--primary-soft, rgba(99, 102, 241, 0.15))',
            color: 'var(--primary, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="mail" size={28} />
        </div>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>Verify your email</h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.95rem' }}>
          We sent a 6-digit verification code to
        </p>

        {isEditingEmail ? (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ maxWidth: '260px', padding: '6px 12px', fontSize: '0.9rem' }}
            />
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setIsEditingEmail(false)}
              disabled={!email}
            >
              Done
            </button>
          </div>
        ) : (
          <p style={{ marginTop: '6px', fontWeight: 600, color: 'var(--text, #111)' }}>
            {email || 'your email'}{' '}
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="link"
              style={{ fontSize: '0.85rem', marginLeft: '6px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #4f46e5)' }}
            >
              Change
            </button>
          </p>
        )}
      </div>

      <form onSubmit={handleVerify}>
        <div className="field" style={{ marginBottom: '20px' }}>
          <label htmlFor="verify-code" style={{ textAlign: 'center', display: 'block', marginBottom: '8px' }}>
            Enter 6-digit code
          </label>
          <input
            id="verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={handleCodeChange}
            placeholder="······"
            autoFocus
            style={{
              textAlign: 'center',
              letterSpacing: '12px',
              fontSize: '2rem',
              fontWeight: 700,
              padding: '12px',
              fontFamily: 'monospace'
            }}
            required
          />
        </div>

        {error && (
          <div
            className="error-text"
            style={{
              margin: '0 0 16px',
              textAlign: 'center',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="success-text"
            style={{
              margin: '0 0 16px',
              textAlign: 'center',
              padding: '10px 14px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', marginBottom: '14px', padding: '12px' }}
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify email'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            style={{ fontSize: '0.9rem' }}
          >
            {resending
              ? 'Sending code...'
              : countdown > 0
              ? `Resend code in ${countdown}s`
              : 'Resend code'}
          </button>
        </div>
      </form>

      <p className="muted" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
        Already verified?{' '}
        <Link to="/login" className="success-text" style={{ fontWeight: 600 }}>
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmail
