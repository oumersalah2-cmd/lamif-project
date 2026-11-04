import axios from 'axios'
import { clearSession } from './session'

// Clean and normalize the base URL:
// 1. Trim whitespace
// 2. Strip trailing slashes
// 3. Strip trailing /api or /api/ so BASE_URL is always the root origin
const rawEnvUrl = (import.meta.env.VITE_API_URL || '').trim()
const cleanedEnvUrl = rawEnvUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '')

// In dev, fallback to http://localhost:5000 if VITE_API_URL is unset.
// In production, fallback to empty string (relative paths or current host) - never hardcoded localhost or old domain.
export const BASE_URL = cleanedEnvUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '')

// Backward compatibility for components expecting API_URL
export const API_URL = BASE_URL

// Helper to construct API endpoint URLs with exactly one slash between segments
export const apiUrl = (path = '') => {
  const cleanPath = String(path).replace(/^\/+/, '')
  const prefix = BASE_URL ? `${BASE_URL}/api` : '/api'
  return cleanPath ? `${prefix}/${cleanPath}` : prefix
}

// Helper to construct static/uploaded file URLs with exactly one slash
export const fileUrl = path => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const cleanPath = String(path).replace(/^\/+/, '')
  return BASE_URL ? `${BASE_URL}/${cleanPath}` : `/${cleanPath}`
}

const api = axios.create({
  baseURL: apiUrl()
})

api.interceptors.request.use(config => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    // Strip leading slashes to prevent protocol-relative '//...' or double slashes
    let cleanUrl = config.url.replace(/^\/+/, '')
    // Guard: if someone passes '/api/foo', strip duplicate 'api/' since baseURL already ends in /api
    if (cleanUrl.startsWith('api/')) {
      cleanUrl = cleanUrl.slice(4)
    } else if (cleanUrl === 'api') {
      cleanUrl = ''
    }
    config.url = '/' + cleanUrl
  }

  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// An expired or invalid token: drop the session and send the user to log in again
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      clearSession()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error.response?.data?.message || fallback

export const isUnverifiedError = error =>
  error?.response?.status === 403 &&
  (error.response?.data?.code === 'EMAIL_NOT_VERIFIED' ||
    /verify.*email/i.test(error.response?.data?.message || ''))

export default api
