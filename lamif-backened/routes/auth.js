const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')
const { issueVerification, hashToken } = require('../lib/emailVerification')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Rate limiters for auth endpoints
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  const raw = forwarded ? String(forwarded).split(',')[0] : (req.ip || req.socket?.remoteAddress || '127.0.0.1')
  // Strip trailing port if present (Azure proxy attaches :port)
  return String(raw).trim().replace(/:\d+$/, '')
}

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many registration requests. Please try again later.' }
})

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many verification attempts. Please try again later.' }
})

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many verification email requests. Please try again later.' }
})

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: !!user.emailVerified
})

router.post('/register', registerLimiter, async (req, res) => {
  const { name, password, role } = req.body
  const email = String(req.body.email || '').trim().toLowerCase()

  if (!name || !String(name).trim()) throw httpError(400, 'Name is required')
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, 'Enter a valid email address')
  if (!password || String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters')
  // Admins are created with scripts/makeAdmin.js, never through sign-up
  if (!['student', 'tutor'].includes(role)) throw httpError(400, 'Choose student or tutor')

  const existingUser = await User.findOne({ email })
  if (existingUser) throw httpError(400, 'User already exists')

  const hashedPassword = await bcrypt.hash(String(password), 10)

  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hashedPassword,
    role,
    emailVerified: false
  })

  let verificationToken = null
  try {
    verificationToken = await issueVerification(user)
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err)
  }

  res.status(201).json({
    message: 'Account created. Check your email to verify your address.',
    verificationRequired: true,
    email: user.email,
    verificationToken,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'lamif_verify_bot'
  })
})

router.post('/verify-email', verifyLimiter, async (req, res) => {
  const token = String(req.body.token || '')
  const user = await User.findOne({ verificationTokenHash: hashToken(token) })
  if (!token || !user) {
    throw httpError(400, 'This verification link is invalid or has already been used')
  }
  if (!user.verificationExpires || user.verificationExpires <= new Date()) {
    throw httpError(400, 'This verification link has expired. Please request a new one.')
  }

  user.emailVerified = true
  user.verificationMethod = 'email'
  user.verificationTokenHash = undefined
  user.verificationExpires = undefined
  await user.save()

  res.status(200).json({ message: 'Email verified. You can now log in.' })
})

router.post('/resend-verification', resendLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  let verificationToken = null
  if (email) {
    const user = await User.findOne({ email })
    if (user && !user.emailVerified) {
      try {
        verificationToken = await issueVerification(user)
      } catch (err) {
        console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err)
      }
    }
  }

  res.status(200).json({
    message: 'If the account exists and is unverified, a verification email has been sent.',
    verificationToken,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'lamif_verify_bot'
  })
})

router.get('/verification-status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  const token = String(req.query.token || '').trim()

  if (!email && !token) {
    return res.status(400).json({ verified: false })
  }

  let user = null
  if (email) {
    user = await User.findOne({ email })
  } else if (token) {
    user = await User.findOne({ verificationTokenHash: hashToken(token) })
  }

  if (!user) {
    return res.status(200).json({ verified: false })
  }

  res.status(200).json({
    verified: !!user.emailVerified,
    method: user.verificationMethod || (user.emailVerified ? 'email' : null)
  })
})

router.get('/telegram-link', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email) throw httpError(400, 'Email is required')

  const user = await User.findOne({ email })
  if (!user) throw httpError(404, 'User not found')
  if (user.emailVerified) {
    return res.status(200).json({ verified: true })
  }

  // Issue a fresh token if missing or expired
  let token = null
  if (!user.verificationTokenHash || !user.verificationExpires || user.verificationExpires <= new Date()) {
    token = await issueVerification(user)
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'lamif_verify_bot'
  res.status(200).json({
    verified: false,
    botUsername,
    token
  })
})

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim()
  const password = String(req.body.password || '')

  // Accounts created before emails were lowercased may still have mixed case
  const user = await User.findOne({ email: email.toLowerCase() }) || await User.findOne({ email })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(400, 'Invalid credentials')
  }
  if (!user.emailVerified) {
    return res.status(403).json({
      message: 'Please verify your email before logging in',
      code: 'EMAIL_NOT_VERIFIED'
    })
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, emailVerified: !!user.emailVerified },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(200).json({ message: 'Login successful', token, user: publicUser(user) })
})

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw httpError(404, 'User not found')
  res.json({ user: publicUser(user) })
})

module.exports = router
