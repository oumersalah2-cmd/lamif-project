import { useState } from 'react'
import Icon from './Icon'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark-mode'))

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.body.classList.toggle('dark-mode', next)
    try {
      localStorage.setItem('lamif_theme', next ? 'dark' : 'light')
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Private mode
    }
  }

  const label = isDark ? 'Switch to light mode (white)' : 'Switch to dark mode'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={`theme-switch ${isDark ? 'is-dark' : ''}`}
    >
      <Icon name="sun" size={14} className="theme-switch-sun" />
      <Icon name="moon" size={14} className="theme-switch-moon" />
      <span className="theme-switch-knob">
        <Icon name={isDark ? 'moon' : 'sun'} size={14} />
      </span>
    </button>
  )
}

export default ThemeToggle
