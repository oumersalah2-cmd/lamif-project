import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Icon from '../components/Icon'
import api, { errorMessage } from '../lib/api'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const emailParam = (searchParams.get('email') || '').trim()
  const tokenParam = (searchParams.get('token') || '').trim()
  const isRegisteredFlow = searchParams.get('registered') === 'true'

  // If there's a token AND it's NOT the registered selection flow, it came directly from email link
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
          setTimeout(() => {
            navigate('/login')
          }, 2000)
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
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ marginBottom: '8px' }}>Verify Your Email</h1>
          {loading && <p className="muted">Verifying your email token...</p>}
          {!loading && message && <p className="success-text" style={{ fontSize: '1rem', margin: '16px 0' }}>{message}</p>}
          {!loading && error && <p className="error-text" style={{ fontSize: '1rem', margin: '16px 0' }}>{error}</p>}
          {!loading && (
            <p style={{ marginTop: '2rem' }}>
              <Link to="/login" className="btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                Proceed to Log in
              </Link>
            </p>
          )}
        </div>
      </AuthLayout>
    )
  }

  // Render Dual Option Verification Screen
  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Verify Your Account</h1>
        <p className="muted" style={{ margin: 0, fontSize: '0.95rem' }}>
          Choose your preferred method to activate your account
        </p>
        {email && (
          <div style={{ marginTop: '8px', fontWeight: 600, color: 'var(--primary-strong)' }}>
            {email}
          </div>
        )}
      </div>

      {isVerified ? (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            background: 'var(--primary-soft)',
            border: '1px solid var(--primary-glow)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary-strong)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px var(--primary-glow)'
          }}>
            <Icon name="check" size={28} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px', color: 'var(--text-main)' }}>
            Account Verified!
          </h2>
          <p className="muted" style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
            {verifiedMethod === 'telegram'
              ? 'Successfully verified via Telegram Bot.'
              : 'Your email has been verified.'}
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Redirecting you to login...
          </p>
          <Link
            to="/login"
            className="btn-primary"
            style={{ display: 'inline-flex', marginTop: '16px', textDecoration: 'none' }}
          >
            Log in now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* OPTION 1: TELEGRAM */}
          <div
            className="glass-card"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              border: '1.5px solid var(--primary)',
              background: 'var(--bg-card)',
              boxShadow: '0 4px 20px var(--primary-glow)',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-11px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--primary-strong)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              boxShadow: '0 2px 8px var(--primary-glow)'
            }}>
              Recommended • 1-Click Instant
            </div>

            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--primary-soft)',
              color: 'var(--primary-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '6px auto 12px'
            }}>
              <Icon name="telegram" size={24} />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: 'var(--text-main)' }}>
              Verify with Telegram
            </h3>
            <p className="muted" style={{ fontSize: '0.9rem', margin: '0 0 18px', lineHeight: 1.45 }}>
              Tap the button to open <strong>@{botUsername}</strong> and tap <strong>START</strong>. Your account verifies instantly!
            </p>

            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '0.85rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              <Icon name="telegram" size={20} />
              <span>Open Telegram &amp; Tap Start</span>
            </a>

            <div style={{
              marginTop: '14px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary)',
                boxShadow: '0 0 0 3px var(--primary-soft)',
                animation: 'pulse 1.8s infinite ease-in-out'
              }} />
              <span>Waiting for Telegram verification...</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '4px 0',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
            <span>Or verify via email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
          </div>

          {/* OPTION 2: EMAIL */}
          <div
            className="glass-card"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-card)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--input-bg)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}>
              <Icon name="mail" size={20} />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Check your inbox
            </h3>
            <p className="muted" style={{ fontSize: '0.88rem', margin: '0 0 16px', lineHeight: 1.4 }}>
              We sent a verification link to <strong>{email || 'your email'}</strong>. Click it to activate your account.
            </p>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              style={{ width: '100%', fontSize: '0.9rem' }}
            >
              {resending
                ? 'Resending email...'
                : resendCooldown > 0
                ? `Resend email in ${resendCooldown}s`
                : 'Resend verification email'}
            </button>

            {resendNotice && (
              <p className="success-text" style={{ fontSize: '0.85rem', margin: '10px 0 0' }}>
                {resendNotice}
              </p>
            )}
            {error && (
              <p className="error-text" style={{ fontSize: '0.85rem', margin: '10px 0 0' }}>
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
