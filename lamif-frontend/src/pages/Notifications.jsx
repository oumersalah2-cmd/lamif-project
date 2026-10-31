import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { timeAgo } from '../lib/format'

function Notifications() {
  const [notifications, setNotifications] = useState(null)

  useEffect(() => {
    api.get('/notifications').then(res => setNotifications(res.data.notifications)).catch(() => setNotifications([]))
  }, [])

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    setNotifications(list => list.map(n => ({ ...n, read: true })))
  }

  const open = n => {
    if (!n.read) api.put(`/notifications/${n._id}/read`).catch(() => {})
  }

  return (
    <div className="page" style={{ maxWidth: '760px' }}>
      <div className="page-header">
        <h1>Notifications</h1>
        {notifications?.some(n => !n.read) && <button className="btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>}
      </div>
      {notifications === null ? <p className="muted">Loading...</p> : notifications.length === 0 ? (
        <div className="glass-card empty">You're all caught up.</div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {notifications.map(n => (
            <Link key={n._id} to={n.link || '#'} onClick={() => open(n)} className={`notification ${n.read ? '' : 'unread'}`}>
              <div>
                <div>{n.message}</div>
                <div className="muted small">{timeAgo(n.createdAt)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
