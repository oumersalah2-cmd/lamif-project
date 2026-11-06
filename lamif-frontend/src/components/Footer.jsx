import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from '../lib/LanguageContext'
import api from '../lib/api'

const DEFAULT_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'English']

export default function Footer({ subjects: initialSubjects }) {
  const { t } = useLanguage()
  const [subjects, setSubjects] = useState(initialSubjects || [])

  useEffect(() => {
    if (initialSubjects && initialSubjects.length > 0) return
    api.get('/public/highlights')
      .then(res => {
        if (res.data?.subjects?.length) {
          setSubjects(res.data.subjects.slice(0, 4).map(s => s.name || s))
        } else {
          setSubjects(DEFAULT_SUBJECTS)
        }
      })
      .catch(() => setSubjects(DEFAULT_SUBJECTS))
  }, [initialSubjects])

  const subjectList = subjects.length > 0 ? subjects : DEFAULT_SUBJECTS

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p className="muted" style={{ maxWidth: '320px', marginTop: '14px', lineHeight: 1.5 }}>
            {t('footer.mission')}
          </p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <LanguageToggle />
            <a
              href="https://t.me/LamifTutors"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-tg-pill"
              title="Official Telegram Channel: https://t.me/LamifTutors"
            >
              <Icon name="telegram" size={15} /> <span>{t('footer.joinTelegram')}</span>
            </a>
          </div>
        </div>

        <div>
          <h4>{t('footer.forStudents')}</h4>
          <Link to="/browse-tutors">{t('footer.findTutor')}</Link>
          <Link to="/register" state={{ role: 'student' }}>{t('footer.postJob')}</Link>
          <Link to="/browse-tutors?verified=true">{t('footer.verifiedTutors')}</Link>
        </div>

        <div>
          <h4>{t('footer.forTutors')}</h4>
          <Link to="/register" state={{ role: 'tutor' }}>{t('footer.becomeTutor')}</Link>
          <Link to="/jobs">{t('footer.tutoringJobs')}</Link>
          <Link to="/login">{t('footer.tutorLogin')}</Link>
        </div>

        <div>
          <h4>{t('footer.subjects')}</h4>
          {subjectList.map(name => (
            <Link key={name} to={`/browse-tutors?subject=${encodeURIComponent(name)}`}>
              {name}
            </Link>
          ))}
        </div>

        <div>
          <h4>{t('footer.contact')}</h4>
          <div className="footer-contacts">
            <a
              href="https://t.me/LamifTutors"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-link footer-contact-tg"
            >
              <Icon name="telegram" size={15} /> <span>t.me/LamifTutors</span>
            </a>
            <a href="tel:+251916139859" className="footer-contact-link">
              <Icon name="phone" size={15} /> <span>0916 139 859</span>
            </a>
            <a href="tel:+251934978247" className="footer-contact-link">
              <Icon name="phone" size={15} /> <span>0934 978 247</span>
            </a>
            <a href="tel:+251961733334" className="footer-contact-link">
              <Icon name="phone" size={15} /> <span>+251 96 173 3334</span>
            </a>
            <a href="mailto:admin@httpslamif-platfor.me" className="footer-contact-link" style={{ marginTop: '4px' }}>
              <Icon name="mail" size={15} /> <span>admin@httpslamif-platfor.me</span>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {t('footer.copyright')}</span>
        <span>{t('footer.madeFor')}</span>
      </div>
    </footer>
  )
}

