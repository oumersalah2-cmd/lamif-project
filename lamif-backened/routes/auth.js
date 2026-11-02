const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')
const mailer = require('../lib/mailer')

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
  message: { message: 'Too many code resend requests. Please try again later.' }
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

  // Generate a random 6-digit verification code (100000 - 999999)
  const code = String(crypto.randomInt(100000, 1000000))
  const verificationCodeHash = await bcrypt.hash(code, 10)
  const verificationExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hashedPassword,
    role,
    emailVerified: false,
    verificationCodeHash,
    verificationExpires,
    verificationAttempts: 0,
    verificationLastSentAt: new Date()
  })

  let emailSent = true
  try {
    await mailer.sendVerificationEmail(email, code)
  } catch (err) {
    emailSent = false
    console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err.message)
  }

  res.status(201).json({
    message: emailSent
      ? 'User registered successfully. Please check your email for the verification code.'
      : 'User registered, but the verification email could not be sent. Please request a new code.',
    email: user.email,
    emailVerified: false,
    emailSent
  })
})

router.post('/verify-email', verifyLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const code = String(req.body.code || '').trim()

  if (!email || !code) throw httpError(400, 'Email and 6-digit code are required')

  const user = await User.findOne({ email })
  if (!user) throw httpError(404, 'User not found')

  if (user.emailVerified) {
    return res.status(200).json({ message: 'Email already verified. Please log in.' })
  }

  // Max 5 attempts
  if (user.verificationAttempts >= 5) {
    throw httpError(400, 'Too many failed verification attempts. Please request a new code.')
  }

  // Expiry check (10 minutes)
  if (!user.verificationExpires || user.verificationExpires < new Date()) {
    throw httpError(400, 'Verification code has expired. Please request a new code.')
  }

  const isMatch = await bcrypt.compare(code, user.verificationCodeHash || '')
  if (!isMatch) {
    user.verificationAttempts = (user.verificationAttempts || 0) + 1
    await user.save()
    const remaining = 5 - user.verificationAttempts
    if (remaining <= 0) {
      throw httpError(400, 'Too many failed verification attempts. Please request a new code.')
    }
    throw httpError(400, `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
  }

  // Success: mark verified and clear code fields
  user.emailVerified = true
  user.verificationCodeHash = undefined
  user.verificationExpires = undefined
  user.verificationAttempts = 0
  user.verificationLastSentAt = undefined
  await user.save()

  const token = jwt.sign(
    { id: user._id, role: user.role, emailVerified: true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(200).json({
    message: 'Email verified successfully',
    token,
    user: publicUser(user)
  })
})

router.post('/resend-code', resendLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  if (!email) throw httpError(400, 'Email is required')

  const user = await User.findOne({ email })
  if (!user) throw httpError(404, 'User not found')
  if (user.emailVerified) throw httpError(400, 'Email is already verified')

  // 60-second cooldown
  const now = Date.now()
  if (user.verificationLastSentAt) {
    const elapsed = now - new Date(user.verificationLastSentAt).getTime()
    if (elapsed < 60000) {
      const waitSeconds = Math.ceil((60000 - elapsed) / 1000)
      throw httpError(429, `Please wait ${waitSeconds} seconds before requesting a new code`)
    }
  }

  const previousLastSentAt = user.verificationLastSentAt
  const code = String(crypto.randomInt(100000, 1000000))
  user.verificationCodeHash = await bcrypt.hash(code, 10)
  user.verificationExpires = new Date(now + 10 * 60 * 1000)
  user.verificationAttempts = 0
  user.verificationLastSentAt = new Date(now)
  await user.save()

  try {
    await mailer.sendVerificationEmail(user.email, code)
  } catch (err) {
    user.verificationLastSentAt = previousLastSentAt
    await user.save()
    console.error(`[MAILER ERROR] Failed to send verification email to ${user.email}:`, err.message)
    return res.status(503).json({ message: 'We could not send the email right now. Please try again soon.' })
  }

  res.status(200).json({ message: 'Verification code resent successfully', email: user.email })
})

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim()
  const password = String(req.body.password || '')

  // Accounts created before emails were lowercased may still have mixed case
  const user = await User.findOne({ email: email.toLowerCase() }) || await User.findOne({ email })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(400, 'Invalid credentials')
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

