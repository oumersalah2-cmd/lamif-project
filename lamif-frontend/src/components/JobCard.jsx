import { Link } from 'react-router-dom'
import Icon from './Icon'
import { budgetText, levelLabel, modeLabel, statusLabel, timeAgo } from '../lib/format'

function JobCard({ job, showStatus }) {
  return (
    <Link to={`/jobs/${job._id}`} className="glass-card card tutor-row" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div className="row-between">
        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{job.title}</h3>
        {showStatus && <span className={`status-badge status-${job.status}`}>{statusLabel(job.status)}</span>}
      </div>
      <div className="tutor-meta">
        <span><strong>{budgetText(job)}</strong></span>
        <span>{modeLabel(job.mode)}</span>
        <span>{levelLabel(job.level)}</span>
        {job.location && <span><Icon name="pin" size={14} />{job.location}</span>}
        <span>Posted {timeAgo(job.createdAt)}</span>
      </div>
      <p className="clamp-2 muted">{job.description}</p>
      <div className="row-between">
        <span className="subject-tag">{job.subject}</span>
        <span className="small muted">{job.proposalCount} proposal{job.proposalCount === 1 ? '' : 's'}</span>
      </div>
    </Link>
  )
}

export default JobCard
