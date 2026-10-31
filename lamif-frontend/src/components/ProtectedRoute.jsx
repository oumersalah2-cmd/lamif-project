import { Navigate, useLocation } from 'react-router-dom'
import { getUser } from '../lib/session'

// Sends anonymous visitors to log in, and users without the right role to their dashboard
function ProtectedRoute({ roles, children }) {
  const user = getUser()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  return children
}

export default ProtectedRoute
