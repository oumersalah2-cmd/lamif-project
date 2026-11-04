import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import translations from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('lamif_lang') || 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = useCallback((newLang) => {
    const valid = newLang === 'am' ? 'am' : 'en'
    setLangState(valid)
    try {
      localStorage.setItem('lamif_lang', valid)
    } catch {
      // storage unavailable
    }
    document.documentElement.lang = valid
    if (valid === 'am') {
      document.body.classList.add('lang-am')
    } else {
      document.body.classList.remove('lang-am')
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    if (lang === 'am') {
      document.body.classList.add('lang-am')
    } else {
      document.body.classList.remove('lang-am')
    }
  }, [lang])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'am' : 'en')
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
    isAmharic: lang === 'am'
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
