import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import translations from './translations'

const SUPPORTED_LANGS = ['en', 'am', 'om']
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('lamif_lang')
      return SUPPORTED_LANGS.includes(saved) ? saved : 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = useCallback((newLang) => {
    const valid = SUPPORTED_LANGS.includes(newLang) ? newLang : 'en'
    setLangState(valid)
    try {
      localStorage.setItem('lamif_lang', valid)
    } catch {
      // storage unavailable
    }
    document.documentElement.lang = valid
    document.body.classList.toggle('lang-am', valid === 'am')
    document.body.classList.toggle('lang-om', valid === 'om')
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.body.classList.toggle('lang-am', lang === 'am')
    document.body.classList.toggle('lang-om', lang === 'om')
  }, [lang])

  const toggleLang = useCallback(() => {
    const cycle = { en: 'am', am: 'om', om: 'en' }
    setLang(cycle[lang] || 'en')
  }, [lang, setLang])

  const t = useCallback((key, fallback = '') => {
    const dict = translations[lang] || translations.en
    const val = dict[key]
    if (val !== undefined) return val
    const fallbackVal = translations.en[key]
    if (fallbackVal !== undefined) return fallbackVal
    return fallback || key
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    toggleLang,
    t,
    isAmharic: lang === 'am',
    isOromo: lang === 'om'
  }), [lang, setLang, toggleLang, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}

export default LanguageContext

