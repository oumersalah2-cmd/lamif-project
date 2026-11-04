const express = require('express')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth')
const tutorRoutes = require('./routes/tutor')
const bookingRoutes = require('./routes/booking')
const reviewRoutes = require('./routes/review')
const jobRoutes = require('./routes/job')
const proposalRoutes = require('./routes/proposal')
const messageRoutes = require('./routes/message')
const notificationRoutes = require('./routes/notification')
const savedRoutes = require('./routes/saved')
const adminRoutes = require('./routes/admin')
const publicRoutes = require('./routes/public')
const protect = require('./middleware/authMiddleware')
const errorHandler = require('./middleware/errorHandler')
const { corsOptions, isAllowedOrigin, normalizeOrigin } = require('./lib/corsConfig')

const app = express()
app.set('trust proxy', 1)

// Normalize malformed request URLs (e.g. collapsing multiple leading slashes like //api/... -> /api/...)
// This ensures routes match properly and malformed paths do not bypass routing or CORS.
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('//')) {
    req.url = '/' + req.url.replace(/^\/+/, '')
  }
  next()
})

// CORS middleware handles both regular requests and preflight OPTIONS requests across all routes
app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))

app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => {
  res.send('LAMIF API is running')
})

app.get('/api/health', (req, res) => {
  if (req.query.debug !== undefined) {
    return res.status(200).json({
      status: 'ok',
      env: {
        NODE_ENV: process.env.NODE_ENV || '(not set)',
        SMTP_HOST: process.env.SMTP_HOST ? '✅ set' : '❌ missing',
        SMTP_PORT: process.env.SMTP_PORT || '(not set)',
        SMTP_SECURE: process.env.SMTP_SECURE || '(not set)',
        SMTP_USER: process.env.SMTP_USER ? '✅ set' : '❌ missing',
        SMTP_PASS: process.env.SMTP_PASS ? '✅ set' : '❌ missing',
        MAIL_FROM: process.env.MAIL_FROM || '(not set)',
        CLIENT_URL: process.env.CLIENT_URL || '(not set)',
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ set' : '❌ missing',
        TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'lamif_verify_bot',
        MONGO_URI: process.env.MONGO_URI ? '✅ set' : '❌ missing',
        JWT_SECRET: process.env.JWT_SECRET ? '✅ set' : '❌ missing'
      }
    })
  }
  res.status(200).json({ status: 'ok' })
})

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const { handleTelegramUpdate } = require('./lib/telegramBot')
    await handleTelegramUpdate(req.body)
  } catch (err) {
    console.error('[TELEGRAM WEBHOOK ERROR]', err.message || err)
  }
  res.status(200).send('OK')
})

app.use('/api/auth', authRoutes)
app.use('/api/tutor', tutorRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/proposals', proposalRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/saved', savedRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/public', publicRoutes)

app.get('/api/protected', protect, (req, res) => {
  res.json({ message: 'you are authorized!', user: req.user })
})

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})
app.use(errorHandler)

module.exports = app
