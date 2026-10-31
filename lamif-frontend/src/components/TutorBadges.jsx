import Icon from './Icon'
import { AVAILABILITY_LABELS, BADGE_LABELS } from '../lib/format'

const BADGE_ICONS = { verified: 'shield', top_rated: 'trophy', rising_talent: 'trendingUp' }

function TutorBadges({ tutor, showAvailability = true }) {
  const active = tutor.stats?.activeStudents || 0
  return (
    <div className="row" style={{ gap: '8px' }}>
      {(tutor.badges || []).map(badge => (
        <span key={badge} className={`badge badge-${badge}`}><Icon name={BADGE_ICONS[badge]} size={13} strokeWidth={2.4} />{BADGE_LABELS[badge]}</span>
      ))}
      {showAvailability && tutor.availabilityStatus && (
        <span className={`availability availability-${tutor.availabilityStatus}`}>
          {AVAILABILITY_LABELS[tutor.availabilityStatus]}
        </span>
      )}
      {active > 0 && <span className="muted small">· Active with {active} student{active > 1 ? 's' : ''}</span>}
    </div>
  )
}

export default TutorBadges
