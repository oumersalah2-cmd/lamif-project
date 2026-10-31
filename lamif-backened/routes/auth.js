const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
})

router.post('/register', async (req, res) => {
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
  await User.create({ name: String(name).trim(), email, password: hashedPassword, role })

  res.status(201).json({ message: 'User registered successfully' })
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
    { id: user._id, role: user.role },
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
