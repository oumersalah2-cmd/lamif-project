import { Link } from 'react-router-dom'
import Icon from './Icon'
import TutorBadges from './TutorBadges'
import { StarRating } from './StarRating'
import Avatar from './Avatar'
import { formatMoney, modeLabel, startingRate } from '../lib/format'

function TutorCard({ tutor, saved, onToggleSave, action }) {
  const { stats } = tutor
  return (
    <div className="tutor-row glass-card">
      <Avatar path={tutor.profilePictureUrl} name={tutor.user?.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row-between">
          <h3><Link to={`/tutors/${tutor._id}`}>{tutor.user?.name}</Link></h3>
          {onToggleSave && (
            <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(tutor._id)} aria-label={saved ? 'Remove from saved' : 'Save tutor'}>
              <Icon name="heart" size={22} fill={saved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        {tutor.headline && <p style={{ margin: '2px 0 6px', fontWeight: 600 }}>{tutor.headline}</p>}
        <TutorBadges tutor={tutor} />
        <div className="tutor-meta">
          <span><strong>{formatMoney(startingRate(tutor))}</strong>/hr</span>
          {stats?.jobSuccessScore != null && <span><strong>{stats.jobSuccessScore}%</strong> Job Success</span>}
          <span><strong>{stats?.completedSessions || 0}</strong> session{stats?.completedSessions === 1 ? '' : 's'}</span>
          <span>{tutor.teachingModes.map(modeLabel).join(' · ')}</span>
          {tutor.location && <span><Icon name="pin" size={14} />{tutor.location}</span>}
        </div>
        <StarRating value={stats?.averageRating} count={stats?.reviewCount} />
        <p className="clamp-2 muted">{tutor.bio}</p>
        <div className="row-between">
          <div>
            {tutor.subjects.map(subject => <span key={subject} className="subject-tag">{subject}</span>)}
          </div>
          {action}
        </div>
      </div>
    </div>
  )
}

export default TutorCard
