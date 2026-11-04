import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './lib/LanguageContext'

const storedTheme = localStorage.getItem('theme');
if (storedTheme === 'dark') {
  document.body.classList.add('dark-mode');
} else {
  document.body.classList.remove('dark-mode');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
