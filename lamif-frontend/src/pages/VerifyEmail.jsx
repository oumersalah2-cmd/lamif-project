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

  // If there's a token AND it's NOT the registered flow, user clicked link directly from email
  const isEmailClick = !!tokenParam && !isRegisteredFlow

  const [email] = useState(emailParam)
  const [loading, setLoading] = useState(isEmailClick)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendNotice, setResendNotice] = useState('')

  const emailVerifyExecuted = useRef(false)

  // 1. Direct Email Link Click Flow (token from URL)
  useEffect(() => {
    if (!isEmailClick || emailVerifyExecuted.current) return
    emailVerifyExecuted.current = true

    api.post('/auth/verify-email', { token: tokenParam })
      .then(response => {
        setMessage(response.data.message || 'Email verified successfully! You can now log in.')
        setIsVerified(true)
      })
      .catch(err => {
        setError(errorMessage(err, 'This verification link is invalid or has expired.'))
      })
      .finally(() => setLoading(false))
  }, [isEmailClick, tokenParam])

  // 2. Real-time check if verified (auto-detects if user clicks link in another tab or mobile)
  useEffect(() => {
    if (isEmailClick || isVerified || !email) return

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/auth/verification-status?email=${encodeURIComponent(email)}`)
        if (res.data.verified) {
          setIsVerified(true)
          clearInterval(interval)
          setTimeout(() => {
            navigate('/login')
          }, 2200)
        }
      } catch {
        // Silently retry
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isEmailClick, isVerified, email, navigate])

  // 3. Resend cooldown timer
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
    setError('')
    try {
      await api.post('/auth/resend-verification', { email })
      setResendNotice('Verification email resent! Please check your inbox and spam folder.')
      setResendCooldown(60)
    } catch (err) {
      setError(errorMessage(err, 'Failed to resend verification email. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  // Render direct email link verification result
  if (isEmailClick) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isVerified ? 'var(--primary-strong)' : 'var(--primary-soft)',
            color: isVerified ? '#ffffff' : 'var(--primary-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: isVerified ? '0 8px 24px var(--primary-glow)' : 'none'
          }}>
            <Icon name={isVerified ? "check" : "mail"} size={30} strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
            {loading ? 'Verifying Your Email...' : isVerified ? 'Email Verified!' : 'Verification Status'}
          </h1>

          {loading && <p className="muted" style={{ fontWeight: 600 }}>Checking verification link...</p>}
          {!loading && message && (
            <p className="success-text" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '16px 0' }}>
              {message}
            </p>
          )}
          {!loading && error && (
            <p className="error-text" style={{ fontSize: '1rem', fontWeight: 700, margin: '16px 0' }}>
              {error}
            </p>
          )}

          {!loading && (
            <p style={{ marginTop: '2rem' }}>
              <Link to="/login" className="btn-primary" style={{ width: '100%', textDecoration: 'none', fontWeight: 700 }}>
                Proceed to Log in
              </Link>
            </p>
          )}
        </div>
      </AuthLayout>
    )
  }

  // If already verified via polling
  if (isVerified) {
    return (
      <AuthLayout>
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            background: 'var(--primary-soft)',
            border: '1.5px solid var(--primary-glow)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--primary-strong)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px var(--primary-glow)'
          }}>
            <Icon name="check" size={30} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)' }}>
            Account Verified!
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Your email has been successfully verified.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Redirecting to login in a moment...
          </p>
          <Link
            to="/login"
            className="btn-primary"
            style={{ display: 'inline-flex', marginTop: '18px', textDecoration: 'none', fontWeight: 700 }}
          >
            Log in now
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // Standard Email Verification Prompt Screen
  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary-soft)',
          color: 'var(--primary-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          border: '1.5px solid var(--primary-glow)'
        }}>
          <Icon name="mail" size={26} strokeWidth={2.5} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
          Verify Your Email
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 500 }}>
          We've sent a verification link to:
        </p>
        {email && (
          <div style={{
            marginTop: '8px',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--primary-strong)',
            wordBreak: 'break-all'
          }}>
            {email}
          </div>
        )}
      </div>

      <div
        className="glass-card"
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          border: '1.5px solid var(--border-glass)',
          background: 'var(--bg-card)',
          textAlign: 'center',
          boxShadow: 'var(--card-shadow)'
        }}
      >
        <p style={{
          fontSize: '0.98rem',
          fontWeight: 600,
          margin: '0 0 18px',
          color: 'var(--text-main)',
          lineHeight: 1.55
        }}>
          Please open your inbox and click the verification link to activate your account.
        </p>

        {/* BOLD SPAM FOLDER NOTICE */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          margin: '0 0 20px',
          textAlign: 'left',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.35rem', lineHeight: 1 }} aria-hidden="true">📁</span>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
              Check your Spam / Junk folder!
            </strong>
            <span>
              If you don't see the email within 1–2 minutes, please <strong>check your Spam or Junk folder</strong> and mark the message as <strong>&ldquo;Not Spam&rdquo;</strong>.
            </span>
          </div>
        </div>

        {/* RESEND BUTTON */}
        <button
          type="button"
          className="btn-primary"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          style={{
            width: '100%',
            padding: '0.85rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: resendCooldown > 0 || resending ? 'not-allowed' : 'pointer'
          }}
        >
          {resending
            ? 'Resending email...'
            : resendCooldown > 0
            ? `Resend email in ${resendCooldown}s`
            : 'Resend Verification Email'}
        </button>

        {resendNotice && (
          <p className="success-text" style={{ fontSize: '0.88rem', fontWeight: 700, margin: '14px 0 0' }}>
            {resendNotice}
          </p>
        )}
        {error && (
          <p className="error-text" style={{ fontSize: '0.88rem', fontWeight: 700, margin: '14px 0 0' }}>
            {error}
          </p>
        )}
      </div>

      <p className="muted" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.92rem', fontWeight: 500 }}>
        Already verified?{' '}
        <Link to="/login" className="success-text" style={{ fontWeight: 700 }}>
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmail
