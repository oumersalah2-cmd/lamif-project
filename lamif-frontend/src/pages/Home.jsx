import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import TutorBadges from '../components/TutorBadges'
import { StarRating } from '../components/StarRating'
import Logo from '../components/Logo'
import GeodesicGlobe3D from '../components/GeodesicGlobe3D'
import LanguageToggle from '../components/LanguageToggle'
import api from '../lib/api'
import { getUser } from '../lib/session'
import { formatMoney, startingRate } from '../lib/format'
import { useLanguage } from '../lib/LanguageContext'

const POPULAR_EN = ['Mathematics', 'Physics', 'English', 'IELTS', 'Programming', 'Chemistry']
const POPULAR_AM = ['ሂሳብ', 'ፊዚክስ', 'እንግሊዝኛ', 'IELTS', 'ፕሮግራሚንግ', 'ኬሚስትሪ']

const FALLBACK_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Programming'].map(name => ({ name }))

// Icon and accent colour for a subject tile, matched on the subject name
const SUBJECT_STYLES = [
  [/math|calculus|statistic|algebra|ሂሳብ/i, 'sigma', '#10b981'],
  [/physic|ፊዚክስ/i, 'atom', '#3b82f6'],
  [/chem|ኬሚስትሪ/i, 'flask', '#8b5cf6'],
  [/bio|ባዮሎጂ/i, 'leaf', '#22c55e'],
  [/english|ielts|toefl|amharic|oromo|language|french|arabic|እንግሊዝኛ|አማርኛ/i, 'languages', '#f59e0b'],
  [/program|computer|code|web|python|software|ፕሮግራሚንግ/i, 'code', '#06b6d4'],
  [/exam|entrance|matric|ፈተና/i, 'trophy', '#ef4444']
]
const subjectStyle = name => {
  const match = SUBJECT_STYLES.find(([pattern]) => pattern.test(name))
  return match ? { icon: match[1], color: match[2] } : { icon: 'book', color: '#14b8a6' }
}

function Home() {
  const navigate = useNavigate()
  const user = getUser()
  const { t, lang } = useLanguage()
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

  const subjects = highlights?.subjects.length ? highlights.subjects.slice(0, 8) : FALLBACK_SUBJECTS

  const popularList = lang === 'am' ? POPULAR_AM : POPULAR_EN

  const stats = highlights && [
    [highlights.tutors, t('stats.tutors')],
    [highlights.sessionsCompleted, t('stats.sessions')],
    [highlights.averageRating != null ? `${highlights.averageRating}★` : '—', t('stats.rating')],
    [highlights.subjects.length, t('stats.subjects')]
  ]

  const levels = [
    { num: 'G1–8', title: t('level.primary.title'), text: t('level.primary.desc') },
    { num: 'G9–10', title: t('level.secondary.title'), text: t('level.secondary.desc') },
    { num: 'G11–12', title: t('level.prep.title'), text: t('level.prep.desc'), highlight: true },
    { num: 'Uni', title: t('level.uni.title'), text: t('level.uni.desc') },
    { num: 'Pro', title: t('level.pro.title'), text: t('level.pro.desc') }
  ]

  const steps = {
    student: [
      ['search', t('step.student.1.title'), t('step.student.1.desc')],
      ['calendar', t('step.student.2.title'), t('step.student.2.desc')],
      ['video', t('step.student.3.title'), t('step.student.3.desc')],
      ['star', t('step.student.4.title'), t('step.student.4.desc')]
    ],
    tutor: [
      ['file', t('step.tutor.1.title'), t('step.tutor.1.desc')],
      ['shield', t('step.tutor.2.title'), t('step.tutor.2.desc')],
      ['briefcase', t('step.tutor.3.title'), t('step.tutor.3.desc')],
      ['trendingUp', t('step.tutor.4.title'), t('step.tutor.4.desc')]
    ]
  }

  const features = [
    ['shield', t('feat.verified.title'), t('feat.verified.desc')],
    ['clock', t('feat.history.title'), t('feat.history.desc')],
    ['lock', t('feat.price.title'), t('feat.price.desc')],
    ['message', t('feat.messaging.title'), t('feat.messaging.desc')],
    ['calendar', t('feat.scheduling.title'), t('feat.scheduling.desc')],
    ['globe', t('feat.modes.title'), t('feat.modes.desc')]
  ]

  return (
    <div className="home-container">
      <Navbar />

      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-pill">
              <b>{lang === 'am' ? 'አዲስ' : 'New'}</b> {t('hero.badge')}
            </span>
            <h1>
              {t('hero.titlePre')}{' '}
              <span className="text-accent">{t('hero.titleAccent')}</span>
              <br />
              {t('hero.titlePost')}
            </h1>
            <p className="hero-lead">
              {t('hero.subtitle')}
            </p>

            <form onSubmit={handleSearch} className="hero-search" role="search">
              <Icon name="search" />
              <input
                aria-label="Search tutors"
                placeholder={t('hero.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn-primary">{t('hero.searchBtn')}</button>
            </form>

            <div className="hero-popular">
              <span>{t('hero.popular')}</span>
              {popularList.map(term => (
                <button key={term} type="button" className="chip" onClick={() => searchFor(term)}>{term}</button>
              ))}
            </div>

            {!user ? (
              <div className="hero-buttons">
                <button onClick={() => navigate('/register', { state: { role: 'student' } })} className="btn-primary btn-lg">
                  {t('hero.startLearning')} <Icon name="arrowRight" size={18} />
                </button>
                <button onClick={() => navigate('/register', { state: { role: 'tutor' } })} className="btn-secondary btn-lg">
                  {t('hero.becomeTutor')}
                </button>
              </div>
            ) : (
              <div className="hero-buttons">
                <button onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')} className="btn-primary btn-lg">
                  {t('hero.goToDashboard')} <Icon name="arrowRight" size={18} />
                </button>
              </div>
            )}

            {featuredTutors.length > 0 && highlights?.averageRating != null && (
              <div className="hero-trust">
                <div className="avatar-stack">
                  {featuredTutors.map(tutor => <Avatar key={tutor._id} path={tutor.profilePictureUrl} name={tutor.user?.name} />)}
                </div>
                <div className="small">
                  <span className="stars">★★★★★</span> <strong>{highlights.averageRating}/5</strong>
                  <div className="muted">{highlights.reviewCount} {t('hero.verifiedReviews')}</div>
                </div>
              </div>
            )}
          </div>

          <div className="hero-visual">
            <div className="hero-orb">
              <GeodesicGlobe3D className="hero-3d-globe" />
            </div>
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
          <p className="eyebrow">{t('subjects.eyebrow')}</p>
          <h2>{t('subjects.title')}</h2>
          <p>{t('subjects.subtitle')}</p>
        </div>
        <div className="subject-grid">
          {subjects.map(subject => {
            const { icon, color } = subjectStyle(subject.name)
            return (
              <Link key={subject.name} to={`/browse-tutors?subject=${encodeURIComponent(subject.name)}`} className="subject-tile glass-card" style={{ '--tile-c': color }}>
                <span className="subject-icon"><Icon name={icon} size={24} /></span>
                <div>
                  <h3>{subject.name}</h3>
                  {subject.tutors != null && (
                    <span className="muted small">
                      {subject.tutors} {subject.tutors === 1 ? t('subjects.tutorSingular') : t('subjects.tutorPlural')}
                    </span>
                  )}
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
            <p className="eyebrow">{t('levels.eyebrow')}</p>
            <h2>{t('levels.title')}</h2>
            <p className="muted" style={{ fontSize: '1.08rem' }}>{t('levels.subtitle')}</p>
            <ul className="check-list">
              <li><Icon name="check" size={18} />{t('levels.check1')}</li>
              <li><Icon name="check" size={18} />{t('levels.check2')}</li>
              <li><Icon name="check" size={18} />{t('levels.check3')}</li>
            </ul>
            <button className="btn-primary" onClick={() => navigate(user?.role === 'student' ? '/jobs/new' : '/register', { state: { role: 'student' } })}>
              {t('levels.postJobBtn')} <Icon name="arrowRight" size={18} />
            </button>
          </div>
          <div className="level-ladder">
            {levels.map(level => (
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
          <p className="eyebrow">{t('how.eyebrow')}</p>
          <h2>{t('how.title')}</h2>
        </div>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={audience === 'student'} className={audience === 'student' ? 'active' : ''} onClick={() => setAudience('student')}>
            {t('how.forStudents')}
          </button>
          <button role="tab" aria-selected={audience === 'tutor'} className={audience === 'tutor' ? 'active' : ''} onClick={() => setAudience('tutor')}>
            {t('how.forTutors')}
          </button>
        </div>
        <div className="steps" style={{ textAlign: 'left' }}>
          {steps[audience].map(([icon, title, text], i) => (
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
          <p className="eyebrow">{t('features.eyebrow')}</p>
          <h2>{t('features.title')}</h2>
          <p>{t('features.subtitle')}</p>
        </div>
        <div className="features-section">
          {features.map(([icon, title, text]) => (
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
              <p className="eyebrow">{t('featured.eyebrow')}</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.9rem)', margin: 0, letterSpacing: '-0.03em' }}>{t('featured.title')}</h2>
            </div>
            <Link to="/browse-tutors" className="btn-secondary btn-sm">{t('featured.viewAll')} <Icon name="arrowRight" size={16} /></Link>
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
                  <span>
                    <strong style={{ fontSize: '1.15rem' }}>{formatMoney(startingRate(tutor))}</strong>
                    <span className="muted small">{t('featured.perHour')}</span>
                  </span>
                  <span className="success-text small" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {t('featured.viewProfile')} <Icon name="arrowRight" size={16} />
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
            <p className="eyebrow">{t('reviews.eyebrow')}</p>
            <h2>{t('reviews.title')}</h2>
            <p>{t('reviews.subtitle')}</p>
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
                    <div className="muted">{review.subject} {t('reviews.withTutor')} <Link className="link success-text" to={`/tutors/${review.tutorId}`}>{review.tutorName}</Link></div>
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
            <p className="eyebrow" style={{ color: '#6ee7b7' }}>{t('tutorCta.eyebrow')}</p>
            <h2>{t('tutorCta.title')}</h2>
            <p>{t('tutorCta.desc')}</p>
            <div className="hero-buttons">
              <button className="btn-primary btn-lg" onClick={() => navigate('/register', { state: { role: 'tutor' } })}>
                {t('tutorCta.becomeBtn')} <Icon name="arrowRight" size={18} />
              </button>
              <button className="btn-secondary btn-lg" onClick={() => navigate('/jobs')}>{t('tutorCta.browseJobs')}</button>
              <a
                href="https://t.me/LamifTutors"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-lg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#229ed9', borderColor: 'rgba(34, 158, 217, 0.4)' }}
              >
                <Icon name="telegram" size={18} /> <span>Telegram @LamifTutors</span>
              </a>
            </div>
          </div>
          <div className="cta-perks">
            {[
              ['wallet', t('tutorCta.perk1')],
              ['calendar', t('tutorCta.perk2')],
              ['sparkles', t('tutorCta.perk3')]
            ].map(([icon, text]) => (
              <div key={text} className="cta-perk"><Icon name={icon} size={22} />{text}</div>
            ))}
          </div>
        </div>
      </section>

      <Footer subjects={subjects.map(s => s.name)} />
    </div>
  )
}

export default Home
