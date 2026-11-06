const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const User = require('../models/User')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')
const { issueVerification, hashToken } = require('../lib/emailVerification')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getAdminEmails = () => {
  const envList = process.env.ADMIN_EMAILS || 'oumersalah@gmail.com,oumersalah2@gmail.com'
  return envList.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}
const isDesignatedAdmin = (email) => getAdminEmails().includes(String(email || '').trim().toLowerCase())

// Rate limiters for auth endpoints
// 'trust proxy' is set in app.js, so req.ip is the real client IP (X-Forwarded-For can't be spoofed past the proxy)
// Azure's proxy may append :port to the address, so strip it
const getClientIp = (req) => String(req.ip || req.socket?.remoteAddress || '127.0.0.1').replace(/:\d+$/, '')

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many registration requests. Please try again later.' }
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many login attempts. Please try again later.' }
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many verification email requests. Please try again later.' }
})

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: 'Too many Google authentication attempts. Please try again later.' }
})

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || '',
  authProvider: user.authProvider || 'local',
  emailVerified: !!user.emailVerified
})

router.post('/register', registerLimiter, async (req, res) => {
  const { name, password, role } = req.body
  const email = String(req.body.email || '').trim().toLowerCase()

  if (!name || !String(name).trim()) throw httpError(400, 'Name is required')
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, 'Enter a valid email address')
  if (!password || String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters')
  // Admins are created with scripts/makeAdmin.js or designated in ADMIN_EMAILS, never arbitrarily chosen through sign-up
  if (!isDesignatedAdmin(email) && !['student', 'tutor'].includes(role)) throw httpError(400, 'Choose student or tutor')

  const existingUser = await User.findOne({ email })
  if (existingUser) throw httpError(400, 'User already exists')

  const hashedPassword = await bcrypt.hash(String(password), 10)
  const isAutoAdmin = isDesignatedAdmin(email)

  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hashedPassword,
    role: isAutoAdmin ? 'admin' : (['student', 'tutor'].includes(role) ? role : 'student'),
    emailVerified: isAutoAdmin ? true : false
  })

  if (!isAutoAdmin) {
    try {
      await issueVerification(user)
    } catch (err) {
      console.error(`[MAILER ERROR] Failed to send verification email to ${email}:`, err)
    }
  }

  res.status(201).json({
    message: isAutoAdmin ? 'Admin account created.' : 'Account created. Check your email to verify your address.',
    verificationRequired: !isAutoAdmin,
    email: user.email
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

router.get('/verification-status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(400).json({ verified: false })
  }
  const user = await User.findOne({ email }).select('emailVerified')
  res.status(200).json({ verified: !!user?.emailVerified })
})

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim()
  const password = String(req.body.password || '')

  // Accounts created before emails were lowercased may still have mixed case
  const user = await User.findOne({ email: email.toLowerCase() }) || await User.findOne({ email })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(400, 'Invalid credentials')
  }

  // Automatically promote designated admin accounts and ensure email is verified
  if (isDesignatedAdmin(user.email)) {
    if (user.role !== 'admin' || !user.emailVerified) {
      user.role = 'admin'
      user.emailVerified = true
      await user.save()
    }
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

router.post('/google', googleLimiter, async (req, res) => {
  const { credential, idToken, accessToken, role, isDevDemo } = req.body
  const tokenToVerify = credential || idToken

  if (!tokenToVerify && !accessToken && !isDevDemo) {
    throw httpError(400, 'Google token is required')
  }

  let googleUser = null

  // 1. Simulated/mock token support for offline tests and local development demo
  if (
    (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') &&
    (isDevDemo || (typeof tokenToVerify === 'string' && tokenToVerify.startsWith('mock-google:')))
  ) {
    if (typeof tokenToVerify === 'string' && tokenToVerify.startsWith('mock-google:')) {
      const parts = tokenToVerify.split(':')
      googleUser = {
        sub: parts[1] || 'mock-google-sub-1',
        email: parts[2] || 'googleuser@example.com',
        name: parts[3] || 'Google User',
        picture: parts[4] || ''
      }
    } else {
      googleUser = {
        sub: req.body.sub || 'demo-google-sub-' + Date.now(),
        email: req.body.email || 'demo.google@lamif.dev',
        name: req.body.name || 'Google Demo User',
        picture: req.body.picture || ''
      }
    }
  } else if (tokenToVerify) {
    // 2. Verify Google ID token via Google tokeninfo endpoint
    try {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`)
      if (!gRes.ok) {
        throw new Error('Google token verification failed')
      }
      const data = await gRes.json()
      if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw httpError(401, 'Google Client ID mismatch')
      }
      if (String(data.email_verified) !== 'true') {
        throw httpError(401, 'Your Google email address is not verified')
      }
      googleUser = {
        sub: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture
      }
    } catch (err) {
      if (err.status) throw err
      console.error('[GOOGLE ID TOKEN ERROR]', err.message || err)
      throw httpError(401, 'Invalid or expired Google token')
    }
  } else if (accessToken) {
    // 3. Verify Google Access Token via Google userinfo endpoint
    try {
      // The token must have been issued to our own app, otherwise a token from any other site could be replayed here
      if (process.env.GOOGLE_CLIENT_ID) {
        const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
        if (!infoRes.ok) throw new Error('Google token verification failed')
        const info = await infoRes.json()
        if (info.aud !== process.env.GOOGLE_CLIENT_ID && info.azp !== process.env.GOOGLE_CLIENT_ID) {
          throw httpError(401, 'Google Client ID mismatch')
        }
      }
      const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!gRes.ok) {
        throw new Error('Google userinfo request failed')
      }
      const data = await gRes.json()
      if (data.email_verified !== true && data.email_verified !== 'true') {
        throw httpError(401, 'Your Google email address is not verified')
      }
      googleUser = {
        sub: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture
      }
    } catch (err) {
      if (err.status) throw err
      console.error('[GOOGLE ACCESS TOKEN ERROR]', err.message || err)
      throw httpError(401, 'Invalid or expired Google access token')
    }
  }

  if (!googleUser || !googleUser.email) {
    throw httpError(400, 'Could not retrieve email from Google account')
  }

  const cleanEmail = String(googleUser.email).trim().toLowerCase()
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw httpError(400, 'Invalid Google email')
  }

  let user = await User.findOne({ $or: [{ googleId: googleUser.sub }, { email: cleanEmail }] })
  const isAutoAdmin = isDesignatedAdmin(cleanEmail)

  if (user) {
    let dirty = false
    if (isAutoAdmin && (user.role !== 'admin' || !user.emailVerified)) {
      user.role = 'admin'
      user.emailVerified = true
      dirty = true
    }
    if (!user.googleId) {
      user.googleId = googleUser.sub
      dirty = true
    }
    if (!user.emailVerified) {
      user.emailVerified = true
      user.verificationMethod = 'google'
      dirty = true
    }
    if (!user.avatar && googleUser.picture) {
      user.avatar = googleUser.picture
      dirty = true
    }
    if (dirty) {
      await user.save()
    }
  } else {
    const chosenRole = isAutoAdmin ? 'admin' : (['student', 'tutor'].includes(role) ? role : 'student')
    const randomPassword = crypto.randomBytes(32).toString('hex')
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    user = await User.create({
      name: (googleUser.name && String(googleUser.name).trim()) || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: hashedPassword,
      role: chosenRole,
      googleId: googleUser.sub,
      authProvider: 'google',
      avatar: googleUser.picture || '',
      emailVerified: true,
      verificationMethod: 'google'
    })
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, emailVerified: !!user.emailVerified },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(200).json({
    message: 'Google authentication successful',
    token,
    user: publicUser(user)
  })
})

module.exports = router
