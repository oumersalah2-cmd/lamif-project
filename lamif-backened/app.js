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

const app = express()
app.set('trust proxy', 1)

const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '')

const allowedOrigins = [
  'https://lamif-platform.vercel.app',
  'http://localhost:5173',
  normalizeOrigin(process.env.CLIENT_URL)
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, or server-to-server health checks)
      if (!origin) return callback(null, true)
      const cleanOrigin = normalizeOrigin(origin)
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true)
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true
  })
)
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => {
  res.send('LAMIF API is running')
})

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
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
