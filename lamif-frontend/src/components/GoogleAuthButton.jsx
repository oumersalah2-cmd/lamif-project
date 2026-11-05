import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../lib/api'
import { saveSession } from '../lib/session'
import { useLanguage } from '../lib/LanguageContext'

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  )
}

function GoogleAuthButton({ role = 'student', text, disabled, onError, onSuccess }) {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [gisLoaded, setGisLoaded] = useState(false)
  const tokenClientRef = useRef(null)

  // Dynamically load Google Identity Services SDK
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setGisLoaded(true)
      return
    }

    const existingScript = document.getElementById('google-gsi-client')
    if (existingScript) {
      existingScript.addEventListener('load', () => setGisLoaded(true))
      return
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-client'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGisLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Initialize token client when GIS and client ID are available
  useEffect(() => {
    if (!gisLoaded || !GOOGLE_CLIENT_ID || !window.google?.accounts?.oauth2) return

    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (response) => {
          if (response.error) {
            onError?.(t('auth.googleFailed'))
            setLoading(false)
            return
          }

          try {
            setLoading(true)
            const apiRes = await api.post('/auth/google', {
              accessToken: response.access_token,
              role
            })

            const { token, user } = apiRes.data
            saveSession(token, user)
            if (onSuccess) {
              onSuccess(user, token)
            } else {
              const home = user.role === 'admin' ? '/admin' : '/dashboard'
              navigate(location.state?.from || home, { replace: true })
            }
          } catch (err) {
            onError?.(errorMessage(err, t('auth.googleFailed')))
          } finally {
            setLoading(false)
          }
        }
      })
    } catch (err) {
      console.error('[GIS INIT ERROR]', err)
    }
  }, [gisLoaded, role, t, location.state, navigate, onError, onSuccess])

  const handleClick = async () => {
    if (loading || disabled) return

    // If Client ID is set and token client initialized, open Google popup
    if (GOOGLE_CLIENT_ID && tokenClientRef.current) {
      setLoading(true)
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
      } catch (err) {
        setLoading(false)
        onError?.(errorMessage(err, t('auth.googleFailed')))
      }
      return
    }

    // In local dev without Google Cloud credentials, provide seamless simulated login
    if (!GOOGLE_CLIENT_ID) {
      if (import.meta.env.DEV) {
        setLoading(true)
        try {
          const apiRes = await api.post('/auth/google', {
            isDevDemo: true,
            role,
            email: `google.user.${role}@example.com`,
            name: role === 'tutor' ? 'Google Educator' : 'Google Student',
            sub: `demo-sub-${Date.now()}`
          })
          const { token, user } = apiRes.data
          saveSession(token, user)
          if (onSuccess) {
            onSuccess(user, token)
          } else {
            const home = user.role === 'admin' ? '/admin' : '/dashboard'
            navigate(location.state?.from || home, { replace: true })
          }
        } catch (err) {
          onError?.(errorMessage(err, t('auth.googleFailed')))
        } finally {
          setLoading(false)
        }
      } else {
        onError?.(t('auth.googleConfigMissing'))
      }
    }
  }

  return (
    <button
      type="button"
      className="btn-google"
      onClick={handleClick}
      disabled={loading || disabled}
      aria-label={text || t('auth.continueWithGoogle')}
    >
      <GoogleIcon size={19} />
      <span>{loading ? t('auth.loggingIn') : (text || t('auth.continueWithGoogle'))}</span>
    </button>
  )
}

export default GoogleAuthButton

