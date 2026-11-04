import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './lib/LanguageContext'

// Platform defaults strictly to white (light mode).
// Dark mode is ONLY activated if the user explicitly toggles it on.
const userThemeChoice = localStorage.getItem('lamif_theme')
if (userThemeChoice === 'dark') {
  document.body.classList.add('dark-mode')
} else {
  document.body.classList.remove('dark-mode')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
