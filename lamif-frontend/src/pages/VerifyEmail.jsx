import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import api, { errorMessage } from '../lib/api'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const requestStarted = useRef(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (requestStarted.current) return
    requestStarted.current = true

    if (!token) {
      setLoading(false)
      setError('This verification link is invalid or has already been used')
      return
    }

    api.post('/auth/verify-email', { token })
      .then(response => setMessage(response.data.message))
      .catch(err => setError(errorMessage(err, 'Failed to verify your email. Please try again.')))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <AuthLayout>
      <h1>Verify your email</h1>
      {loading && <p className="muted">Verifying your email...</p>}
      {!loading && message && <p className="success-text">{message}</p>}
      {!loading && error && <p className="error-text">{error}</p>}
      {!loading && (
        <p className="muted" style={{ marginTop: '2rem' }}>
          <Link to="/login" className="success-text" style={{ fontWeight: 600 }}>Log in</Link>
        </p>
      )}
    </AuthLayout>
  )
}

export default VerifyEmail
