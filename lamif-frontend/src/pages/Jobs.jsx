import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import JobCard from '../components/JobCard'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { LEVELS, levelLabel } from '../lib/format'

function StudentJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState(null)

  useEffect(() => {
    api.get('/jobs/mine').then(res => setJobs(res.data.jobs)).catch(() => setJobs([]))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Hiring</p>
          <h1>My Job Posts</h1>
        </div>
        <button className="btn-primary btn-sm" onClick={() => navigate('/jobs/new')}>+ Post a job</button>
      </div>
      {jobs === null ? <p className="muted">Loading...</p> : jobs.length === 0 ? (
        <div className="glass-card empty">
          <p>Describe what you need help with and tutors will send you proposals.</p>
          <button className="btn-primary btn-sm" onClick={() => navigate('/jobs/new')}>Post your first job</button>
        </div>
      ) : (
        <div className="stack">{jobs.map(job => <JobCard key={job._id} job={job} showStatus />)}</div>
      )}
    </div>
  )
}

function JobFeed() {
  const [params, setParams] = useSearchParams()
  const [jobs, setJobs] = useState(null)
  const [q, setQ] = useState(params.get('q') || '')
  const query = params.toString()

  useEffect(() => {
    let cancelled = false
    api.get(`/jobs?${query}`)
      .then(res => { if (!cancelled) setJobs(res.data.jobs) })
      .catch(() => { if (!cancelled) setJobs([]) })
    return () => { cancelled = true }
  }, [query])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Find work</p>
          <h1>Tutoring Jobs</h1>
        </div>
        <form onSubmit={e => { e.preventDefault(); setFilter('q', q) }} className="row" style={{ flex: '1 1 320px', maxWidth: '520px', flexWrap: 'nowrap' }}>
          <input className="input" placeholder="Search jobs" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="row" style={{ marginBottom: '20px' }}>
        {[['', 'All'], ['online', 'Online'], ['in_person', 'In person']].map(([value, label]) => (
          <button key={label} className={`chip ${(params.get('mode') || '') === value ? 'selected' : ''}`} onClick={() => setFilter('mode', value)}>{label}</button>
        ))}
        <select className="input" style={{ width: 'auto' }} value={params.get('level') || ''} onChange={e => setFilter('level', e.target.value)} aria-label="Level">
          <option value="">Any level</option>
          {LEVELS.map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}
        </select>
      </div>

      {jobs === null ? <p className="muted">Loading...</p> : jobs.length === 0 ? (
        <div className="glass-card empty"><p>No open jobs match right now. Check back soon.</p></div>
      ) : (
        <div className="stack">{jobs.map(job => <JobCard key={job._id} job={job} />)}</div>
      )}
    </div>
  )
}

function Jobs() {
  return getUser()?.role === 'student' ? <StudentJobs /> : <JobFeed />
}

export default Jobs
