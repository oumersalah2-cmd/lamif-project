import Logo from './Logo'
import GeodesicGlobe3D from './GeodesicGlobe3D'
import Icon from './Icon'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from '../lib/LanguageContext'

const BRAND_POINTS = {
  en: [
    'Verified educators with authenticated student evaluations',
    'Tailored virtual & in-person instruction from primary to university',
    'Transparent rates locked firmly the moment you reserve',
    'Post custom learning requests and receive competitive proposals'
  ],
  am: [
    'ትክክለኛ የትምህርት ማስረጃቸው የተረጋገጠ ብቁ አስተማሪዎች',
    'ከመጀመሪያ ደረጃ እስከ ዩኒቨርሲቲ በኦንላይን ወይም በአካል የመማር አማራጭ',
    'በቦታ ማስያዣው ቅጽበት የተረጋገጠ ቋሚና ግልጽ ዋጋ',
    'የሚፈልጉትን የትምህርት ጥያቄ ለጥፈው ብቁ መምህራንን ያግኙ'
  ]
}

function AuthLayout({ children }) {
  const { lang, t } = useLanguage()
  const points = BRAND_POINTS[lang] || BRAND_POINTS.en

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-3d-wrap" aria-hidden="true">
          <GeodesicGlobe3D className="auth-3d-globe" showShadow={false} speed={0.65} interactive={false} />
        </div>
        <Logo size={36} />
        <div>
          <h2>
            {lang === 'am'
              ? 'የኢትዮጵያ ቀዳሚ የትምህርትና ሙያ ማዕከል።'
              : 'Ethiopia\'s Premier Marketplace for Academic Excellence.'}
          </h2>
          <ul>
            {points.map(point => (
              <li key={point}><Icon name="check" size={18} />{point}</li>
            ))}
          </ul>
        </div>
        <p style={{ margin: 0, color: 'rgba(233, 244, 238, 0.6)', fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} LAMIF Educational Platform. {t('footer.madeFor')}
        </p>
      </aside>

      <main className="auth-container">
        <div className="auth-top">
          <span className="auth-mobile-logo"><Logo size={30} /></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-mobile-3d-hero" aria-hidden="true">
            <GeodesicGlobe3D className="auth-mobile-3d-globe" showShadow={false} speed={0.7} interactive={false} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthLayout
