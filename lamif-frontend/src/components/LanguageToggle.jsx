import { useLanguage } from '../lib/LanguageContext'
import Icon from './Icon'

const LANGUAGES = [
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'am', label: 'አማ', title: 'አማርኛ (Amharic)' },
  { code: 'om', label: 'OM', title: 'Afaan Oromoo (Oromo)' }
]

function LanguageToggle({ showIcon = true, className = '' }) {
  const { lang, setLang } = useLanguage()

  return (
    <div
      className={`lang-switch ${className}`}
      role="group"
      aria-label="Language selection"
    >
      {showIcon && <Icon name="globe" size={14} className="lang-icon" />}
      {LANGUAGES.map((item, idx) => (
        <span key={item.code} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {idx > 0 && <span className="lang-divider">|</span>}
          <button
            type="button"
            className={`lang-btn ${lang === item.code ? 'lang-active' : 'lang-inactive'}`}
            onClick={() => setLang(item.code)}
            title={item.title}
            aria-label={item.title}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 3px',
              font: 'inherit',
              cursor: 'pointer'
            }}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  )
}

export default LanguageToggle
