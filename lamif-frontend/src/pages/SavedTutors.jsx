import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TutorCard from '../components/TutorCard'
import api from '../lib/api'

function SavedTutors() {
  const [tutors, setTutors] = useState(null)

  useEffect(() => {
    api.get('/saved').then(res => setTutors(res.data.tutors)).catch(() => setTutors([]))
  }, [])

  const unsave = async tutorId => {
    await api.delete(`/saved/${tutorId}`)
    setTutors(list => list.filter(t => t._id !== tutorId))
  }

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Shortlist</p>
          <h1>Saved Tutors</h1>
        </div>
      </div>
      {tutors === null ? <p className="muted">Loading...</p> : tutors.length === 0 ? (
        <div className="glass-card empty">
          <p>Tap the heart on any tutor to save them here for later.</p>
          <Link className="success-text" to="/browse-tutors">Browse tutors</Link>
        </div>
      ) : (
        <div className="stack">
          {tutors.map(tutor => (
            <TutorCard key={tutor._id} tutor={tutor} saved onToggleSave={unsave}
              action={<Link className="btn-primary btn-sm" style={{ textDecoration: 'none' }} to={`/tutors/${tutor._id}`}>View profile</Link>} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SavedTutors
