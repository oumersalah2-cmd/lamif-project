const normalizeOrigin = (url) => (url ? String(url).trim().replace(/\/+$/, '') : '')

// Explicitly allowed origins without trailing slashes
const STATIC_ALLOWED_ORIGINS = [
  'https://www.httpslamif-platfor.me',
  'https://httpslamif-platfor.me',
  'https://lamif-platform.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
].map(normalizeOrigin)

// Parse dynamic environment variable origins (supports comma-separated values)
function getEnvAllowedOrigins() {
  const envVars = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGINS
  ]
  const list = []
  for (const envVal of envVars) {
    if (envVal) {
      const parts = envVal.split(',').map(normalizeOrigin).filter(Boolean)
      list.push(...parts)
    }
  }
  return list
}

function isAllowedOrigin(origin) {
  if (!origin) return true
  const clean = normalizeOrigin(origin).toLowerCase()

  // Match static origins
  if (STATIC_ALLOWED_ORIGINS.some(o => o.toLowerCase() === clean)) {
    return true
  }

  // Match environment variable origins
  const envOrigins = getEnvAllowedOrigins()
  if (envOrigins.some(o => o.toLowerCase() === clean)) {
    return true
  }

  // Match any Vercel deployment preview or production domain
  if (/^https:\/\/[a-z0-9-]+(?:\.vercel\.app|-oumersalah2-cmds-projects\.vercel\.app)$/i.test(clean)) {
    return true
  }
  if (clean.endsWith('.vercel.app')) {
    return true
  }

  return false
}

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']

// Get a single primary public frontend URL for outgoing emails and links (never a comma-separated list)
function getPrimaryClientUrl() {
  const envVal = process.env.FRONTEND_URL || process.env.CLIENT_URL || ''
  if (envVal) {
    const first = envVal.split(',')[0].trim().replace(/\/+$/, '')
    if (first) return first
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://www.httpslamif-platfor.me'
    : 'http://localhost:5173'
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true)

    if (isAllowedOrigin(origin)) {
      return callback(null, true)
    }
    // Return false without throwing so requests from unauthorized origins do not receive CORS headers
    return callback(null, false)
  },
  credentials: true,
  methods: ALLOWED_METHODS,
  allowedHeaders: ALLOWED_HEADERS,
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204
}

module.exports = {
  normalizeOrigin,
  isAllowedOrigin,
  getPrimaryClientUrl,
  corsOptions,
  ALLOWED_METHODS,
  ALLOWED_HEADERS,
  STATIC_ALLOWED_ORIGINS
}

