import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { formatDate, formatMoney, statusLabel } from '../lib/format'

function MyProposals() {
  const [proposals, setProposals] = useState(null)

  useEffect(() => {
    api.get('/proposals/mine').then(res => setProposals(res.data.proposals)).catch(() => setProposals([]))
  }, [])

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Find work</p>
          <h1>My Proposals</h1>
        </div>
        <Link to="/jobs" className="btn-primary btn-sm" style={{ textDecoration: 'none' }}>Browse jobs</Link>
      </div>
      {proposals === null ? <p className="muted">Loading...</p> : proposals.length === 0 ? (
        <div className="glass-card empty"><p>You haven't sent any proposals yet.</p></div>
      ) : (
        <div className="glass-card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Job</th><th>Client</th><th>Your rate</th><th>Sent</th><th>Status</th></tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p._id}>
                  <td>{p.job ? <Link className="link" to={`/jobs/${p.job._id}`}><strong>{p.job.title}</strong></Link> : 'Deleted job'}</td>
                  <td>{p.job?.student?.name}</td>
                  <td>{formatMoney(p.rate)}/hr</td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td><span className={`status-badge status-${p.status}`}>{statusLabel(p.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MyProposals
