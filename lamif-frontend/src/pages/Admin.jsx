import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage, fileUrl } from '../lib/api'
import { formatDate, formatMoney, statusLabel } from '../lib/format'

const FILTERS = [['pending', 'Pending review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]

function Admin() {
  const [stats, setStats] = useState(null)
  const [tutors, setTutors] = useState([])
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(err => setError(errorMessage(err)))
    api.get(`/admin/tutors${filter ? `?status=${filter}` : ''}`).then(res => setTutors(res.data.tutors)).catch(err => setError(errorMessage(err)))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const setVerification = async (id, status) => {
    try {
      await api.put(`/admin/tutors/${id}/verification`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Admin</h1>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="stat-grid">
          {[
            [stats.students, 'Students'],
            [stats.tutors, 'Tutors'],
            [stats.pendingTutors, 'Awaiting verification'],
            [stats.openJobs, 'Open jobs'],
            [Object.values(stats.bookingsByStatus).reduce((a, b) => a + b, 0), 'Bookings'],
            [formatMoney(stats.completedVolume), 'Completed volume']
          ].map(([value, label]) => (
            <div key={label} className="glass-card stat-tile">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      <h2>Tutor verification</h2>
      <div className="tabs">
        {FILTERS.map(([value, label]) => (
          <button key={label} className={`tab ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {tutors.length === 0 ? (
        <div className="glass-card empty">No tutors here.</div>
      ) : (
        <div className="glass-card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Tutor</th><th>Subjects</th><th>Education</th><th>Documents</th><th>Joined</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {tutors.map(t => (
                <tr key={t._id}>
                  <td>
                    <Link className="link" to={`/tutors/${t._id}`}><strong>{t.user?.name}</strong></Link>
                    <div className="muted small">{t.user?.email}</div>
                  </td>
                  <td>{t.subjects.join(', ')}</td>
                  <td className="small">{t.education}</td>
                  <td>{t.cvUrl ? <a className="success-text" href={fileUrl(t.cvUrl)} target="_blank" rel="noreferrer">CV</a> : <span className="muted small">None</span>}</td>
                  <td className="small">{formatDate(t.createdAt)}</td>
                  <td><span className={`status-badge status-${t.verificationStatus}`}>{statusLabel(t.verificationStatus)}</span></td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      {t.verificationStatus !== 'approved' && <button className="btn-primary btn-sm" onClick={() => setVerification(t._id, 'approved')}>Approve</button>}
                      {t.verificationStatus !== 'rejected' && <button className="btn-ghost btn-sm btn-danger" onClick={() => setVerification(t._id, 'rejected')}>Reject</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Admin
