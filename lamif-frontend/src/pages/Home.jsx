import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import TutorBadges from '../components/TutorBadges'
import { StarRating } from '../components/StarRating'
import Logo, { LogoMark } from '../components/Logo'
import GeodesicGlobe3D from '../components/GeodesicGlobe3D'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { formatMoney, startingRate } from '../lib/format'

const POPULAR = ['Mathematics', 'Physics', 'English', 'IELTS', 'Programming', 'Chemistry']

const FALLBACK_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Programming'].map(name => ({ name }))

// Icon and accent colour for a subject tile, matched on the subject name
const SUBJECT_STYLES = [
  [/math|calculus|statistic|algebra/i, 'sigma', '#10b981'],
  [/physic/i, 'atom', '#3b82f6'],
  [/chem/i, 'flask', '#8b5cf6'],
  [/bio/i, 'leaf', '#22c55e'],
  [/english|ielts|toefl|amharic|oromo|language|french|arabic/i, 'languages', '#f59e0b'],
  [/program|computer|code|web|python|software/i, 'code', '#06b6d4'],
  [/exam|entrance|matric/i, 'trophy', '#ef4444']
]
const subjectStyle = name => {
  const match = SUBJECT_STYLES.find(([pattern]) => pattern.test(name))
  return match ? { icon: match[1], color: match[2] } : { icon: 'book', color: '#14b8a6' }
}

const LEVELS = [
  { num: 'G1–8', title: 'Primary school', text: 'Reading, maths foundations and homework help' },
  { num: 'G9–10', title: 'Secondary school', text: 'Core sciences, languages and regional exams' },
  { num: 'G11–12', title: 'Preparatory & national exam', text: 'Focused ESSLCE preparation with past papers', highlight: true },
  { num: 'Uni', title: 'University', text: 'Calculus, programming, statistics and coursework' },
  { num: 'Pro', title: 'Professional skills', text: 'IELTS, TOEFL, coding and career skills' }
]

const STEPS = {
  student: [
    ['search', 'Find your tutor', 'Filter by subject, price, rating and availability, or post a job and let tutors come to you.'],
    ['calendar', 'Book a time', 'Pick a slot that fits their weekly schedule. The price is locked the moment you book.'],
    ['video', 'Learn your way', 'Meet online or in person, and keep in touch with built-in messaging.'],
    ['star', 'Review & grow', 'Rate each session to track progress and help other students choose.']
  ],
  tutor: [
    ['file', 'Build your profile', 'Add your subjects, education, CV, rates for online and in-person, and weekly hours.'],
    ['shield', 'Get verified', 'Our team reviews your credentials so students see the Verified badge.'],
    ['briefcase', 'Win students', 'Get booked directly or send proposals on tutoring jobs that match your skills.'],
    ['trendingUp', 'Grow your reputation', 'Every completed session builds your work history, Job Success Score and badges.']
  ]
}

const FEATURES = [
  ['shield', 'Verified tutors', 'Credentials are reviewed by our team before a tutor earns the Verified badge.'],
  ['clock', 'Real work history', 'Sessions and reviews are recorded by the platform, so reputations can\'t be faked.'],
  ['lock', 'Locked-in prices', 'The rate you book at is the rate you pay, even if the tutor changes prices later.'],
  ['message', 'Built-in messaging', 'Talk to tutors before and after you book, all in one inbox.'],
  ['calendar', 'Flexible scheduling', 'See each tutor\'s weekly hours and book the time that suits you.'],
  ['globe', 'Online or in person', 'Learn from anywhere in Ethiopia, or meet a tutor in your city.']
]

function Home() {
  const navigate = useNavigate()
  const user = getUser()
  const [featuredTutors, setFeaturedTutors] = useState([])
  const [highlights, setHighlights] = useState(null)
  const [search, setSearch] = useState('')
  const [audience, setAudience] = useState('student')

  useEffect(() => {
    api.get('/tutor/all?sort=best_match')
      .then(res => setFeaturedTutors(res.data.tutors.slice(0, 3)))
      .catch(error => console.error('Failed to fetch tutors for homepage:', error))
    api.get('/public/highlights')
      .then(res => setHighlights(res.data))
      .catch(error => console.error('Failed to fetch highlights:', error))
  }, [])

  const searchFor = term => navigate(`/browse-tutors${term ? `?q=${encodeURIComponent(term)}` : ''}`)

  const handleSearch = e => {
    e.preventDefault()
    searchFor(search.trim())
  }

  const heroTutor = featuredTutors[0]
  const heroReview = highlights?.reviews[0]
  const subjects = highlights?.subjects.length ? highlights.subjects.slice(0, 8) : FALLBACK_SUBJECTS

  const stats = highlights && [
    [highlights.tutors, 'Expert tutors'],
    [highlights.sessionsCompleted, 'Sessions completed'],
    [highlights.averageRating != null ? `${highlights.averageRating}★` : '—', 'Average rating'],
    [highlights.subjects.length, 'Subjects taught']
  ]

  return (
    <div className="home-container">
      <Navbar />

      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-pill"><b>New</b> Post a job and get proposals from tutors</span>
            <h1>Learn from Ethiopia's <span className="text-accent">best tutors.</span><br />Master any subject.</h1>
            <p className="hero-lead">From Grade 1 to the national exam and university: verified tutors, real reviews, and prices that are locked the moment you book.</p>

            <form onSubmit={handleSearch} className="hero-search" role="search">
              <Icon name="search" />
              <input aria-label="Search tutors" placeholder="What do you want to learn?" value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn-primary">Search</button>
            </form>
            <div className="hero-popular">
              <span>Popular:</span>
              {POPULAR.map(term => (
                <button key={term} type="button" className="chip" onClick={() => searchFor(term)}>{term}</button>
              ))}
            </div>

            {!user ? (
              <div className="hero-buttons">
                <button onClick={() => navigate('/register', { state: { role: 'student' } })} className="btn-primary btn-lg">
                  Start learning <Icon name="arrowRight" size={18} />
                </button>
                <button onClick={() => navigate('/register', { state: { role: 'tutor' } })} className="btn-secondary btn-lg">
                  Become a tutor
                </button>
              </div>
            ) : (
              <div className="hero-buttons">
                <button onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')} className="btn-primary btn-lg">
                  Go to your dashboard <Icon name="arrowRight" size={18} />
                </button>
              </div>
            )}

            {featuredTutors.length > 0 && highlights?.averageRating != null && (
              <div className="hero-trust">
                <div className="avatar-stack">
                  {featuredTutors.map(t => <Avatar key={t._id} path={t.profilePictureUrl} name={t.user?.name} />)}
                </div>
                <div className="small">
                  <span className="stars">★★★★★</span> <strong>{highlights.averageRating}/5</strong>
                  <div className="muted">from {highlights.reviewCount} verified session reviews</div>
                </div>
              </div>
            )}
          </div>

          <div className="hero-visual">
            <div className="hero-orb">
              <GeodesicGlobe3D className="hero-3d-globe" />
            </div>

            {heroTutor && (
              <div className="float-card float-tutor">
                <div className="row" style={{ flexWrap: 'nowrap', marginBottom: '10px' }}>
                  <Avatar path={heroTutor.profilePictureUrl} name={heroTutor.user?.name} className="avatar-sm" />
                  <div style={{ minWidth: 0 }}>
                    <h4>{heroTutor.user?.name}</h4>
                    <div className="muted small clamp-2" style={{ margin: 0 }}>{heroTutor.headline}</div>
                  </div>
                </div>
                <TutorBadges tutor={heroTutor} />
                <div className="row-between" style={{ marginTop: '10px' }}>
                  <StarRating value={heroTutor.stats.averageRating} count={heroTutor.stats.reviewCount} />
                  <strong className="success-text">{formatMoney(startingRate(heroTutor))}/hr</strong>
                </div>
              </div>
            )}

            <div className="float-card float-session">
              <div className="float-label"><span className="float-icon"><Icon name="calendar" size={16} /></span>Session confirmed</div>
              <h4>{heroTutor?.subjects[0] || 'Mathematics'}</h4>
              <div className="muted small">Tuesday · 5:00 PM · Online</div>
              <div className="small" style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="lock" size={14} className="success-text" /> Price locked
              </div>
            </div>

            <div className="float-card float-progress">
              <div className="float-label"><span className="float-icon"><Icon name="trendingUp" size={16} /></span>Exam readiness</div>
              <div className="progress-bars">
                {[38, 50, 61, 72, 92].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
              </div>
              <div className="row-between small muted" style={{ marginTop: '6px' }}><span>Week 1</span><span>Week 5</span></div>
            </div>

            {heroReview && (
              <div className="float-card float-review">
                <div className="stars small">{'★'.repeat(heroReview.rating)}</div>
                <p className="small clamp-2" style={{ margin: '6px 0' }}>"{heroReview.comment}"</p>
                <div className="muted small">{heroReview.studentName} · {heroReview.subject}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {stats && (
        <div className="stats-band">
          <div className="stats-band-inner glass-card">
            {stats.map(([value, label]) => (
              <div key={label} className="stats-band-item">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Explore subjects</p>
          <h2>Whatever you're studying, there's a tutor for it</h2>
          <p>Browse by subject to find tutors who specialise in exactly what you need.</p>
        </div>
        <div className="subject-grid">
          {subjects.map(subject => {
            const { icon, color } = subjectStyle(subject.name)
            return (
              <Link key={subject.name} to={`/browse-tutors?subject=${encodeURIComponent(subject.name)}`} className="subject-tile glass-card" style={{ '--tile-c': color }}>
                <span className="subject-icon"><Icon name={icon} size={24} /></span>
                <div>
                  <h3>{subject.name}</h3>
                  {subject.tutors != null && <span className="muted small">{subject.tutors} tutor{subject.tutors === 1 ? '' : 's'}</span>}
                </div>
                <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="levels">
          <div>
            <p className="eyebrow">Built for the Ethiopian curriculum</p>
            <h2>Support at every stage of your education</h2>
            <p className="muted" style={{ fontSize: '1.08rem' }}>Our tutors know the Ethiopian syllabus, from primary foundations to the Grade 12 national exam and beyond.</p>
            <ul className="check-list">
              <li><Icon name="check" size={18} />Tutors who studied and teach the national curriculum</li>
              <li><Icon name="check" size={18} />Exam preparation with past papers and mock tests</li>
              <li><Icon name="check" size={18} />Lessons in Amharic, Afaan Oromo, English and more</li>
            </ul>
            <button className="btn-primary" onClick={() => navigate(user?.role === 'student' ? '/jobs/new' : '/register', { state: { role: 'student' } })}>
              Post what you need <Icon name="arrowRight" size={18} />
            </button>
          </div>
          <div className="level-ladder">
            {LEVELS.map(level => (
              <div key={level.title} className={`level-step glass-card ${level.highlight ? 'level-highlight' : ''}`}>
                <span className="level-num">{level.num}</span>
                <div>
                  <strong>{level.title}</strong>
                  <span>{level.text}</span>
                </div>
                {level.highlight && <Icon name="trophy" size={22} style={{ marginLeft: 'auto', color: '#fbbf24' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, textAlign: 'center' }}>
        <div className="section-head">
          <p className="eyebrow">How it works</p>
          <h2>Simple for students. Rewarding for tutors.</h2>
        </div>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={audience === 'student'} className={audience === 'student' ? 'active' : ''} onClick={() => setAudience('student')}>For students</button>
          <button role="tab" aria-selected={audience === 'tutor'} className={audience === 'tutor' ? 'active' : ''} onClick={() => setAudience('tutor')}>For tutors</button>
        </div>
        <div className="steps" style={{ textAlign: 'left' }}>
          {STEPS[audience].map(([icon, title, text], i) => (
            <div key={title} className="step-card glass-card">
              <span className="step-index">0{i + 1}</span>
              <div className="step-number"><Icon name={icon} size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">Why LAMIF</p>
          <h2>A marketplace built on trust</h2>
          <p>Everything you need to find the right tutor, and nothing that gets in the way.</p>
        </div>
        <div className="features-section">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="feature-card glass-card">
              <span className="subject-icon" style={{ '--tile-c': '#10b981' }}><Icon name={icon} size={24} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {featuredTutors.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="row-between" style={{ alignItems: 'flex-end', marginBottom: '32px' }}>
            <div>
              <p className="eyebrow">Top tutors</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.9rem)', margin: 0, letterSpacing: '-0.03em' }}>Learn from the best</h2>
            </div>
            <Link to="/browse-tutors" className="btn-secondary btn-sm">View all tutors <Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="featured-grid">
            {featuredTutors.map(tutor => (
              <Link key={tutor._id} to={`/tutors/${tutor._id}`} className="featured-card glass-card">
                <div className="row" style={{ flexWrap: 'nowrap', marginBottom: '14px' }}>
                  <Avatar path={tutor.profilePictureUrl} name={tutor.user?.name} />
                  <div style={{ minWidth: 0 }}>
                    <h3>{tutor.user?.name}</h3>
                    <StarRating value={tutor.stats.averageRating} count={tutor.stats.reviewCount} />
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{tutor.headline}</p>
                <TutorBadges tutor={tutor} />
                <div style={{ margin: '14px 0' }}>
                  {tutor.subjects.map(s => <span key={s} className="subject-tag">{s}</span>)}
                </div>
                <div className="featured-foot">
                  <span><strong style={{ fontSize: '1.15rem' }}>{formatMoney(startingRate(tutor))}</strong><span className="muted small">/hr</span></span>
                  <span className="success-text small" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    View profile <Icon name="arrowRight" size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {highlights?.reviews.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <p className="eyebrow">Student stories</p>
            <h2>Real results from real sessions</h2>
            <p>Every review on LAMIF comes from a completed, paid session.</p>
          </div>
          <div className="quote-grid">
            {highlights.reviews.map(review => (
              <figure key={review.id} className="quote-card glass-card" style={{ margin: 0 }}>
                <div className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                <blockquote>"{review.comment}"</blockquote>
                <figcaption className="row" style={{ marginTop: 'auto' }}>
                  <Avatar name={review.studentName} className="avatar-sm" />
                  <div className="small">
                    <strong>{review.studentName}</strong>
                    <div className="muted">{review.subject} with <Link className="link success-text" to={`/tutors/${review.tutorId}`}>{review.tutorName}</Link></div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="cta-band">
          <div>
            <p className="eyebrow" style={{ color: '#6ee7b7' }}>For tutors</p>
            <h2>Teach what you know. Earn on your schedule.</h2>
            <p>Join LAMIF to reach students across Ethiopia. Set your own rates, choose your hours, and build a reputation that speaks for itself.</p>
            <div className="hero-buttons">
              <button className="btn-primary btn-lg" onClick={() => navigate('/register', { state: { role: 'tutor' } })}>
                Become a tutor <Icon name="arrowRight" size={18} />
              </button>
              <button className="btn-secondary btn-lg" onClick={() => navigate('/jobs')}>Browse tutoring jobs</button>
            </div>
          </div>
          <div className="cta-perks">
            {[['wallet', 'Set your own online and in-person rates'], ['calendar', 'Teach only during the hours you choose'], ['sparkles', 'Earn Rising Talent and Top Rated badges']].map(([icon, text]) => (
              <div key={text} className="cta-perk"><Icon name={icon} size={22} />{text}</div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="muted" style={{ maxWidth: '320px', marginTop: '14px' }}>Connecting Ethiopian students with qualified tutors, online and in person.</p>
          </div>
          <div>
            <h4>For students</h4>
            <Link to="/browse-tutors">Find a tutor</Link>
            <Link to="/register" state={{ role: 'student' }}>Post a job</Link>
            <Link to="/browse-tutors?verified=true">Verified tutors</Link>
          </div>
          <div>
            <h4>For tutors</h4>
            <Link to="/register" state={{ role: 'tutor' }}>Become a tutor</Link>
            <Link to="/jobs">Tutoring jobs</Link>
            <Link to="/login">Tutor login</Link>
          </div>
          <div>
            <h4>Subjects</h4>
            {subjects.slice(0, 4).map(s => <Link key={s.name} to={`/browse-tutors?subject=${encodeURIComponent(s.name)}`}>{s.name}</Link>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} LAMIF Educational Platform. All rights reserved.</span>
          <span>Made for learners across Ethiopia</span>
        </div>
      </footer>
    </div>
  )
}

export default Home
