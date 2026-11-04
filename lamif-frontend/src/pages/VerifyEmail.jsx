import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import api, { errorMessage } from '../lib/api'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const emailParam = (searchParams.get('email') || '').trim()
  const tokenParam = (searchParams.get('token') || '').trim()
  const isRegisteredFlow = searchParams.get('registered') === 'true'

  // If there's a token AND it's NOT the registered selection flow, it came directly from email
  const isEmailClick = !!tokenParam && !isRegisteredFlow

  const [token, setToken] = useState(tokenParam)
  const [email, setEmail] = useState(emailParam)
  const [botUsername, setBotUsername] = useState('lamif_verify_bot')

  const [loading, setLoading] = useState(isEmailClick)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verifiedMethod, setVerifiedMethod] = useState('')

  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendNotice, setResendNotice] = useState('')

  const emailVerifyExecuted = useRef(false)

  // 1. Direct Email Link Click Flow
  useEffect(() => {
    if (!isEmailClick || emailVerifyExecuted.current) return
    emailVerifyExecuted.current = true

    api.post('/auth/verify-email', { token: tokenParam })
      .then(response => {
        setMessage(response.data.message || 'Email verified successfully! You can now log in.')
        setIsVerified(true)
        setVerifiedMethod('email')
      })
      .catch(err => {
        setError(errorMessage(err, 'This verification link is invalid or has expired.'))
      })
      .finally(() => setLoading(false))
  }, [isEmailClick, tokenParam])

  // 2. Fetch fresh token or bot info if in dual-choice flow without token
  useEffect(() => {
    if (isEmailClick || isVerified) return
    if (!token && email) {
      api.get(`/auth/telegram-link?email=${encodeURIComponent(email)}`)
        .then(res => {
          if (res.data.verified) {
            setIsVerified(true)
          } else {
            if (res.data.token) setToken(res.data.token)
            if (res.data.botUsername) setBotUsername(res.data.botUsername)
          }
        })
        .catch(() => {})
    }
  }, [isEmailClick, isVerified, token, email])

  // 3. Real-time Polling for Telegram verification completion
  useEffect(() => {
    if (isEmailClick || isVerified) return
    if (!email && !token) return

    const interval = setInterval(async () => {
      try {
        const query = email ? `email=${encodeURIComponent(email)}` : `token=${encodeURIComponent(token)}`
        const res = await api.get(`/auth/verification-status?${query}`)
        if (res.data.verified) {
          setIsVerified(true)
          setVerifiedMethod(res.data.method || 'telegram')
          clearInterval(interval)
          // Automatically redirect to login after 2 seconds
          setTimeout(() => {
            navigate('/login')
          }, 2200)
        }
      } catch {
        // Silently retry
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [isEmailClick, isVerified, email, token, navigate])

  // 4. Countdown timer for Resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return
    setResending(true)
    setResendNotice('')
    try {
      const res = await api.post('/auth/resend-verification', { email })
      if (res.data.verificationToken) {
        setToken(res.data.verificationToken)
      }
      if (res.data.telegramBotUsername) {
        setBotUsername(res.data.telegramBotUsername)
      }
      setResendNotice('Verification email resent! Check your inbox.')
      setResendCooldown(60)
    } catch (err) {
      setError(errorMessage(err, 'Failed to resend verification email.'))
    } finally {
      setResending(false)
    }
  }

  const telegramLink = token
    ? `https://t.me/${botUsername}?start=${token}`
    : `https://t.me/${botUsername}`

  // Render direct email link verification status
  if (isEmailClick) {
    return (
      <AuthLayout>
        <h1>Verify your email</h1>
        {loading && <p className="muted">Verifying your email token...</p>}
        {!loading && message && <p className="success-text">{message}</p>}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && (
          <p className="muted" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none' }}>
              Proceed to Log in
            </Link>
          </p>
        )}
      </AuthLayout>
    )
  }

  // Render Dual Option Verification Screen
  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Verify Your Account</h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.95rem' }}>
          Choose your preferred method to activate your account:
        </p>
        {email && (
          <div style={{ marginTop: '6px', fontWeight: 600, color: 'var(--primary, #4f46e5)' }}>
            {email}
          </div>
        )}
      </div>

      {isVerified ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '14px',
          margin: '1rem 0'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.4rem', color: '#16a34a', margin: '0 0 8px' }}>
            Account Verified!
          </h2>
          <p className="muted" style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
            {verifiedMethod === 'telegram'
              ? 'Successfully verified via Telegram Bot.'
              : 'Your email has been verified.'}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #666)' }}>
            Redirecting you to login...
          </p>
          <Link
            to="/login"
            className="btn-primary"
            style={{ display: 'inline-block', marginTop: '12px', padding: '10px 24px', textDecoration: 'none' }}
          >
            Log in now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* OPTION 1: TELEGRAM */}
          <div style={{
            border: '2px solid #2AABEE',
            borderRadius: '14px',
            padding: '20px',
            background: 'rgba(42, 171, 238, 0.05)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2AABEE',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 12px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Instant &amp; Free (Recommended)
            </div>

            <div style={{ fontSize: '2rem', marginBottom: '8px', marginTop: '4px' }}>✈️</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem' }}>Verify via Telegram Bot</h3>
            <p className="muted" style={{ fontSize: '0.88rem', margin: '0 0 16px', lineHeight: 1.4 }}>
              Click the button to open <b>@{botUsername}</b> and tap <b>START</b>. Your account verifies in 1 second!
            </p>

            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                background: '#2AABEE',
                borderColor: '#2AABEE',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                padding: '12px',
                textDecoration: 'none',
                borderRadius: '8px'
              }}
            >
              <span>Open Telegram &amp; Tap Start</span>
            </a>

            <div style={{
              marginTop: '12px',
              fontSize: '0.82rem',
              color: 'var(--text-muted, #71717a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2AABEE',
                animation: 'pulse 1.5s infinite ease-in-out'
              }} />
              Listening for your Telegram verification...
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '4px 0',
            color: 'var(--text-muted, #999)',
            fontSize: '0.85rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border, #e4e4e7)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border, #e4e4e7)' }} />
          </div>

          {/* OPTION 2: EMAIL */}
          <div style={{
            border: '1px solid var(--border, #e4e4e7)',
            borderRadius: '14px',
            padding: '18px',
            background: 'var(--card-bg, #ffffff)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>📧</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Verify via Email Link</h3>
            <p className="muted" style={{ fontSize: '0.88rem', margin: '0 0 14px', lineHeight: 1.4 }}>
              Check your inbox (or spam folder) for the verification link we sent to <b>{email || 'your email'}</b>.
            </p>

            <button
              type="button"
              className="btn-ghost"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
            >
              {resending
                ? 'Resending email...'
                : resendCooldown > 0
                ? `Resend email in ${resendCooldown}s`
                : 'Resend verification email'}
            </button>

            {resendNotice && (
              <p className="success-text" style={{ fontSize: '0.85rem', margin: '8px 0 0' }}>
                {resendNotice}
              </p>
            )}
            {error && (
              <p className="error-text" style={{ fontSize: '0.85rem', margin: '8px 0 0' }}>
                {error}
              </p>
            )}
          </div>
        </div>
      )}

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
