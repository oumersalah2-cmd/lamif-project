import { useLanguage } from '../lib/LanguageContext'
import Icon from './Icon'

function LanguageToggle({ showIcon = true, className = '' }) {
  const { lang, toggleLang } = useLanguage()
  const isAm = lang === 'am'
  const title = isAm ? 'Switch to English' : 'ወደ አማርኛ ቀይር (Switch to Amharic)'

  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      onClick={toggleLang}
      title={title}
      aria-label={title}
    >
      {showIcon && <Icon name="globe" size={14} className="lang-icon" />}
      <span className={!isAm ? 'lang-active' : 'lang-inactive'}>EN</span>
      <span className="lang-divider">|</span>
      <span className={isAm ? 'lang-active' : 'lang-inactive'}>አማ</span>
    </button>
  )
}

export default LanguageToggle
