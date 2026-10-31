import axios from 'axios'
import { clearSession } from './session'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({ baseURL: `${API_URL}/api` })

api.interceptors.request.use(config => {
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

export const fileUrl = path => (path ? `${API_URL}${path}` : '')

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error.response?.data?.message || fallback

export default api
