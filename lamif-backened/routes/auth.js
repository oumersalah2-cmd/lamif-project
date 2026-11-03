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
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration requests. Please try again later.' }
})

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please try again later.' }
})

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
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

  try {
    await issueVerification(user)
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err)
  }

  res.status(201).json({
    message: 'Account created. Check your email to verify your address.',
    verificationRequired: true
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
  user.verificationTokenHash = undefined
  user.verificationExpires = undefined
  await user.save()

  res.status(200).json({ message: 'Email verified. You can now log in.' })
})

router.post('/resend-verification', resendLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  if (email) {
    const user = await User.findOne({ email })
    if (user && !user.emailVerified) {
      try {
        await issueVerification(user)
      } catch (err) {
        console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err)
      }
    }
  }

  res.status(200).json({
    message: 'If the account exists and is unverified, a verification email has been sent.'
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
