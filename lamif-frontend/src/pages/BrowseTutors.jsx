import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TutorCard from '../components/TutorCard'
import HireModal from '../components/HireModal'
import { ALL_CURRICULUM_SUBJECTS } from '../lib/curriculum'
import api from '../lib/api'
import { getUser } from '../lib/session'
import useSavedTutors from '../lib/useSavedTutors'

const SORT_OPTIONS = [
  ['best_match', 'Best match'],
  ['rating', 'Highest rated'],
  ['sessions', 'Most sessions'],
  ['price_low', 'Price: low to high'],
  ['price_high', 'Price: high to low'],
  ['newest', 'Newest']
]

function BrowseTutors() {
  const navigate = useNavigate()
  const user = getUser()
  const [params, setParams] = useSearchParams()
  const [tutors, setTutors] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [hiring, setHiring] = useState(null)
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState({ q: params.get('q') || '', minRate: params.get('minRate') || '', maxRate: params.get('maxRate') || '' })
  const { savedIds, toggleSaved, canSave } = useSavedTutors()

  const query = params.toString()

  useEffect(() => {
    api.get('/tutor/subjects')
      .then(res => {
        const set = new Set([...(res.data?.subjects || []), ...ALL_CURRICULUM_SUBJECTS])
        setSubjects(Array.from(set).sort((a, b) => a.localeCompare(b)))
      })
      .catch(() => setSubjects(ALL_CURRICULUM_SUBJECTS))
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get(`/tutor/all?${query}`)
      .then(res => { if (!cancelled) setTutors(res.data.tutors) })
      .catch(() => { if (!cancelled) setTutors([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const applyDraft = e => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(draft)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setDraft({ q: '', minRate: '', maxRate: '' })
    setParams({}, { replace: true })
  }

  const handleHire = tutor => {
    if (!user) navigate('/login', { state: { from: `/tutors/${tutor._id}` } })
    else setHiring(tutor)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Talent marketplace</p>
          <h1>Find a Tutor</h1>
        </div>
        <form onSubmit={applyDraft} className="row" style={{ flex: '1 1 320px', maxWidth: '520px', flexWrap: 'nowrap' }}>
          <input className="input" placeholder="Search by name, subject or keyword" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
          <button className="btn-primary btn-sm" type="submit">Search</button>
        </form>
      </div>

      {notice && <div className="glass-card card success-text" style={{ marginBottom: '20px' }}>{notice}</div>}

      <div className="with-sidebar">
        <aside className="glass-card card">
          <div className="row-between" style={{ marginBottom: '12px' }}>
            <strong>Filters</strong>
            <button className="btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
          </div>

          <div className="field">
            <label htmlFor="f-subject">Subject</label>
            <select id="f-subject" value={params.get('subject') || ''} onChange={e => setFilter('subject', e.target.value)}>
              <option value="">Any subject</option>
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <span className="field-label">Session type</span>
            <div className="row">
              {[['', 'Any'], ['online', 'Online'], ['in_person', 'In person']].map(([value, label]) => (
                <button key={label} type="button" className={`chip ${(params.get('mode') || '') === value ? 'selected' : ''}`} onClick={() => setFilter('mode', value)}>{label}</button>
              ))}
            </div>
          </div>

          <form onSubmit={applyDraft} className="field">
            <span className="field-label">Hourly rate (ETB)</span>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="input" type="number" min="0" placeholder="Min" value={draft.minRate} onChange={e => setDraft({ ...draft, minRate: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Max" value={draft.maxRate} onChange={e => setDraft({ ...draft, maxRate: e.target.value })} />
            </div>
            <button type="submit" className="btn-ghost btn-sm">Apply rate</button>
          </form>

          <div className="field">
            <label htmlFor="f-rating">Rating</label>
            <select id="f-rating" value={params.get('minRating') || ''} onChange={e => setFilter('minRating', e.target.value)}>
              <option value="">Any rating</option>
              <option value="4.5">4.5 & up</option>
              <option value="4">4.0 & up</option>
              <option value="3">3.0 & up</option>
            </select>
          </div>

          <label className="row small" style={{ marginBottom: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={params.get('verified') === 'true'} onChange={e => setFilter('verified', e.target.checked ? 'true' : '')} />
            Verified tutors only
          </label>
          <label className="row small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={params.get('availableNow') === 'true'} onChange={e => setFilter('availableNow', e.target.checked ? 'true' : '')} />
            Available now
          </label>
        </aside>

        <section>
          <div className="row-between" style={{ marginBottom: '16px' }}>
            <span className="muted">{loading ? 'Searching...' : `${tutors.length} tutor${tutors.length === 1 ? '' : 's'} found`}</span>
            <select className="input" style={{ width: 'auto' }} value={params.get('sort') || 'best_match'} onChange={e => setFilter('sort', e.target.value)} aria-label="Sort by">
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {!loading && tutors.length === 0 ? (
            <div className="glass-card empty">
              <p>No tutors match these filters.</p>
              <button className="btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <div className="stack">
              {tutors.map(tutor => (
                <TutorCard
                  key={tutor._id}
                  tutor={tutor}
                  saved={savedIds.has(tutor._id)}
                  onToggleSave={canSave ? toggleSaved : null}
                  action={(!user || user.role === 'student') && (
                    <button className="btn-primary btn-sm" onClick={() => handleHire(tutor)} disabled={tutor.availabilityStatus === 'fully_booked'}>
                      {tutor.availabilityStatus === 'fully_booked' ? 'Fully booked' : 'Book session'}
                    </button>
                  )}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {hiring && (
        <HireModal
          tutor={hiring}
          onClose={() => setHiring(null)}
          onDone={() => {
            setHiring(null)
            setNotice('Request sent! You can follow it on your dashboard.')
          }}
        />
      )}
    </div>
  )
}

export default BrowseTutors
