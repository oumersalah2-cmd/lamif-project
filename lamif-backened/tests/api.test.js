// End-to-end API tests against an in-memory MongoDB seeded with the demo data.
// Run with: npm test
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const app = require('../app')
const seed = require('../seed')
const { hashToken } = require('../lib/emailVerification')

const HOUR = 3600000
const DAY = 24 * HOUR

let memoryServer
let server
let baseUrl
const tokens = {}

async function call(method, path, token, body) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body)
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const tutorByName = async name => (await call('GET', '/tutor/all')).data.tutors.find(t => t.user.name.startsWith(name))

// A fresh future time slot for each booking so tests don't collide
let slotOffset = 5
function nextSlot(hours = 1) {
  const start = new Date(Date.now() + slotOffset++ * DAY)
  start.setUTCMinutes(0, 0, 0)
  return { startUtc: start, endUtc: new Date(start.getTime() + hours * HOUR) }
}

before(async () => {
  memoryServer = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
  await mongoose.connect(memoryServer.getUri())
  const log = console.log
  console.log = () => {}
  await seed()
  console.log = log

  server = app.listen(0)
  baseUrl = `http://localhost:${server.address().port}/api`

  for (const name of ['meron', 'yonas', 'liya', 'abebe', 'hana', 'sara', 'admin']) {
    const res = await call('POST', '/auth/login', null, { email: `${name}@lamif.dev`, password: 'password123' })
    tokens[name] = res.data.token
  }
})

after(async () => {
  server.close()
  await mongoose.disconnect()
  await memoryServer.stop()
})

describe('auth and email verification', () => {
  it('rejects self-registration as admin', async () => {
    const res = await call('POST', '/auth/register', null, { name: 'X', email: 'x@example.com', password: 'secret1', role: 'admin' })
    assert.equal(res.status, 400)
  })

  it('normalises email case on register and login', async () => {
    const res = await call('POST', '/auth/register', null, { name: 'Case Test', email: 'Case@Example.com', password: 'secret1', role: 'student' })
    assert.equal(res.status, 201)
    assert.equal(res.data.verificationRequired, true)
    assert.equal(res.data.message, 'Account created. Check your email to verify your address.')

    const user = await User.findOne({ email: 'case@example.com' })
    assert.equal(user.emailVerified, false)
    assert.ok(user.verificationTokenHash)
    assert.ok(user.verificationExpires > new Date())

    await User.updateOne({ email: 'case@example.com' }, { emailVerified: true })
    const login = await call('POST', '/auth/login', null, { email: 'CASE@example.com', password: 'secret1' })
    assert.equal(login.status, 200)
    assert.equal(login.data.user.emailVerified, true)
  })

  it('blocks unverified users from logging in', async () => {
    await call('POST', '/auth/register', null, { name: 'Unverified Login', email: 'unverified-login@example.com', password: 'secret1', role: 'student' })

    const login = await call('POST', '/auth/login', null, { email: 'unverified-login@example.com', password: 'secret1' })
    assert.equal(login.status, 403)
    assert.equal(login.data.code, 'EMAIL_NOT_VERIFIED')
    assert.equal(login.data.token, undefined)
  })

  it('verifies a valid link, rejects reuse, and allows login', async () => {
    const email = 'verify-link@example.com'
    const mailer = require('../lib/mailer')
    const originalSendMail = mailer.sendMail
    let sentMail
    mailer.sendMail = async message => {
      sentMail = message
    }
    try {
      await call('POST', '/auth/register', null, { name: 'Verify Link', email, password: 'password123', role: 'student' })
    } finally {
      mailer.sendMail = originalSendMail
    }
    const token = sentMail.text.match(/\/verify-email\?token=([^\s]+)/)?.[1]
    assert.match(token, /^[a-f0-9]{64}$/)
    assert.equal(sentMail.subject, 'Verify your LAMIF email')

    const createdUser = await User.findOne({ email })
    assert.equal(createdUser.verificationTokenHash, hashToken(token))
    assert.ok(createdUser.verificationExpires > new Date())

    const verified = await call('POST', '/auth/verify-email', null, { token })
    assert.equal(verified.status, 200)
    assert.equal(verified.data.message, 'Email verified. You can now log in.')

    const user = await User.findOne({ email })
    assert.equal(user.emailVerified, true)
    assert.equal(user.verificationTokenHash, undefined)
    assert.equal(user.verificationExpires, undefined)

    const reused = await call('POST', '/auth/verify-email', null, { token })
    assert.equal(reused.status, 400)
    assert.match(reused.data.message, /invalid or has already been used/)

    const login = await call('POST', '/auth/login', null, { email, password: 'password123' })
    assert.equal(login.status, 200)
    assert.equal(login.data.user.emailVerified, true)
  })

  it('verifies a user via Telegram update and updates status', async () => {
    const email = 'telegram-verify@example.com'
    const reg = await call('POST', '/auth/register', null, { name: 'Telegram User', email, password: 'password123', role: 'student' })
    assert.equal(reg.status, 201)
    const token = reg.data.verificationToken
    assert.ok(token)

    const { handleTelegramUpdate } = require('../lib/telegramBot')
    await handleTelegramUpdate({
      message: {
        chat: { id: 123456789 },
        from: { username: 'telegram_user' },
        text: `/start ${token}`
      }
    })

    const status = await call('GET', `/auth/verification-status?email=${encodeURIComponent(email)}`)
    assert.equal(status.status, 200)
    assert.equal(status.data.verified, true)
    assert.equal(status.data.method, 'telegram')

    const user = await User.findOne({ email })
    assert.equal(user.emailVerified, true)
    assert.equal(user.verificationMethod, 'telegram')
    assert.equal(user.telegramChatId, '123456789')
    assert.equal(user.telegramUsername, 'telegram_user')
  })

  it('rejects expired verification links', async () => {
    const email = 'expired-link@example.com'
    const token = 'expired-email-verification-token'
    await call('POST', '/auth/register', null, { name: 'Expired Link', email, password: 'password123', role: 'student' })
    await User.updateOne({ email }, {
      verificationTokenHash: hashToken(token),
      verificationExpires: new Date(Date.now() - 1000)
    })

    const res = await call('POST', '/auth/verify-email', null, { token })
    assert.equal(res.status, 400)
    assert.match(res.data.message, /expired.*request a new one/i)
  })

  it('returns a generic success response when resending for an unknown email', async () => {
    const res = await call('POST', '/auth/resend-verification', null, { email: 'unknown@example.com' })
    assert.equal(res.status, 200)
    assert.equal(res.data.message, 'If the account exists and is unverified, a verification email has been sent.')
  })

  it('blocks unverified users from booking creation, job posting, proposals, and messaging', async () => {
    const reg = await call('POST', '/auth/register', null, { name: 'Unverified Student', email: 'unverified-student@example.com', password: 'password123', role: 'student' })
    assert.equal(reg.status, 201)
    const student = await User.findOne({ email: 'unverified-student@example.com' })
    const token = jwt.sign({ id: student._id, role: student.role, emailVerified: false }, process.env.JWT_SECRET)

    const hana = await tutorByName('Hana')
    const slot = nextSlot(1)

    // Booking creation blocked
    const bookRes = await call('POST', '/booking/hire', token, { tutorId: hana._id, subject: 'English', mode: 'online', ...slot })
    assert.equal(bookRes.status, 403)
    assert.equal(bookRes.data.code, 'EMAIL_NOT_VERIFIED')

    // Job posting blocked
    const jobRes = await call('POST', '/jobs', token, { title: 'Need Math Tutor', subject: 'Math', level: 'secondary', mode: 'online', description: 'Help needed' })
    assert.equal(jobRes.status, 403)
    assert.equal(jobRes.data.code, 'EMAIL_NOT_VERIFIED')

    // Messaging blocked
    const msgRes = await call('POST', '/messages/conversations', token, { userId: hana.user._id })
    assert.equal(msgRes.status, 403)
    assert.equal(msgRes.data.code, 'EMAIL_NOT_VERIFIED')

    // Unverified tutor blocked from sending proposals
    const regTutor = await call('POST', '/auth/register', null, { name: 'Unverified Tutor', email: 'unverified-tutor@example.com', password: 'password123', role: 'tutor' })
    assert.equal(regTutor.status, 201)
    const tutor = await User.findOne({ email: 'unverified-tutor@example.com' })
    const tutorToken = jwt.sign({ id: tutor._id, role: tutor.role, emailVerified: false }, process.env.JWT_SECRET)

    const openJobs = await call('GET', '/jobs')
    assert.ok(openJobs.data.jobs.length > 0)
    const jobId = openJobs.data.jobs[0]._id

    const propRes = await call('POST', `/jobs/${jobId}/proposals`, tutorToken, { coverLetter: 'I can help', rate: 400 })
    assert.equal(propRes.status, 403)
    assert.equal(propRes.data.code, 'EMAIL_NOT_VERIFIED')
  })

  it.skip('rejects invalid code and tracks failed attempts up to 5', async () => {
    const email = 'attempts-test@example.com'
    await call('POST', '/auth/register', null, { name: 'Attempts Test', email, password: 'password123', role: 'student' })

    for (let i = 1; i <= 4; i++) {
      const res = await call('POST', '/auth/verify-email', null, { email, code: '000000' })
      assert.equal(res.status, 400)
      assert.match(res.data.message, /Invalid verification code/)
    }

    // 5th attempt
    const res5 = await call('POST', '/auth/verify-email', null, { email, code: '000000' })
    assert.equal(res5.status, 400)
    assert.match(res5.data.message, /Too many failed verification attempts/)

    // 6th attempt should also be rejected due to max attempts
    const res6 = await call('POST', '/auth/verify-email', null, { email, code: '000000' })
    assert.equal(res6.status, 400)
    assert.match(res6.data.message, /Too many failed verification attempts/)
  })

  it.skip('rejects expired verification codes', async () => {
    const email = 'expired-test@example.com'
    await call('POST', '/auth/register', null, { name: 'Expired Test', email, password: 'password123', role: 'student' })
    
    // Manually expire code in DB
    await User.updateOne({ email }, { verificationExpires: new Date(Date.now() - 1000) })

    const res = await call('POST', '/auth/verify-email', null, { email, code: '123456' })
    assert.equal(res.status, 400)
    assert.match(res.data.message, /expired/)
  })

  it.skip('enforces 60-second cooldown on resend-code and resets attempts with new code', async () => {
    const email = 'resend-test@example.com'
    await call('POST', '/auth/register', null, { name: 'Resend Test', email, password: 'password123', role: 'student' })

    // Immediate resend should trigger 429
    const cooldownRes = await call('POST', '/auth/resend-code', null, { email })
    assert.equal(cooldownRes.status, 429)
    assert.match(cooldownRes.data.message, /Please wait/)

    // Advance verificationLastSentAt past 60s
    await User.updateOne({ email }, { verificationLastSentAt: new Date(Date.now() - 65000), verificationAttempts: 4 })

    const resendSuccess = await call('POST', '/auth/resend-code', null, { email })
    assert.equal(resendSuccess.status, 200)

    const user = await User.findOne({ email })
    assert.equal(user.verificationAttempts, 0) // attempts reset
    assert.ok(user.verificationExpires > new Date())
  })

  it.skip('returns 503 and does not update verificationLastSentAt when resend-code email delivery fails', async () => {
    const email = 'resend-fail@example.com'
    await call('POST', '/auth/register', null, { name: 'Fail Test', email, password: 'password123', role: 'student' })

    const mailer = require('../lib/mailer')
    const originalSend = mailer.sendVerificationEmail
    mailer.sendVerificationEmail = async () => {
      throw new Error('SMTP connection timed out')
    }

    try {
      // Advance cooldown past 60s
      await User.updateOne({ email }, { verificationLastSentAt: new Date(Date.now() - 65000) })

      const failRes = await call('POST', '/auth/resend-code', null, { email })
      assert.equal(failRes.status, 503)
      assert.equal(failRes.data.message, 'We could not send the email right now. Please try again soon.')

      const userAfter = await User.findOne({ email })
      // verificationLastSentAt was reverted and not set to current time
      assert.ok(Date.now() - new Date(userAfter.verificationLastSentAt).getTime() > 60000)
    } finally {
      mailer.sendVerificationEmail = originalSend
    }
  })

  it.skip('successfully verifies email with valid code and unblocks actions', async () => {
    const email = 'verify-success@example.com'
    await call('POST', '/auth/register', null, { name: 'Success Test', email, password: 'password123', role: 'student' })

    // Set a known code hash in DB
    const knownCode = '654321'
    const codeHash = await bcrypt.hash(knownCode, 10)
    await User.updateOne({ email }, { verificationCodeHash: codeHash })

    const verifyRes = await call('POST', '/auth/verify-email', null, { email, code: knownCode })
    assert.equal(verifyRes.status, 200)
    assert.ok(verifyRes.data.token)
    assert.equal(verifyRes.data.user.emailVerified, true)

    // User in DB has fields cleared and emailVerified true
    const user = await User.findOne({ email })
    assert.equal(user.emailVerified, true)
    assert.equal(user.verificationCodeHash, undefined)
    assert.equal(user.verificationExpires, undefined)

    // Post a job now succeeds with verified user token
    const jobRes = await call('POST', '/jobs', verifyRes.data.token, {
      title: 'Need Physics Tutor',
      subject: 'Physics',
      level: 'secondary',
      mode: 'online',
      description: 'Help with exams'
    })
    assert.equal(jobRes.status, 201)
  })

  it.skip('never issues a token when an already-verified user calls verify-email with any or wrong code', async () => {
    const verifiedUser = await User.findOne({ email: 'meron@lamif.dev' })
    assert.equal(verifiedUser.emailVerified, true)

    // With a wrong code
    const wrongRes = await call('POST', '/auth/verify-email', null, { email: 'meron@lamif.dev', code: '999999' })
    assert.equal(wrongRes.status, 200)
    assert.equal(wrongRes.data.token, undefined)
    assert.equal(wrongRes.data.message, 'Email already verified. Please log in.')

    // With any code
    const anyRes = await call('POST', '/auth/verify-email', null, { email: 'meron@lamif.dev', code: '000000' })
    assert.equal(anyRes.status, 200)
    assert.equal(anyRes.data.token, undefined)
    assert.equal(anyRes.data.message, 'Email already verified. Please log in.')
  })

  it('allows unverified users to GET messages and notifications without 403, but blocks POST message creation', async () => {
    const reg = await call('POST', '/auth/register', null, { name: 'Unverified Reader', email: 'unverified-reader@example.com', password: 'password123', role: 'student' })
    assert.equal(reg.status, 201)
    const user = await User.findOne({ email: 'unverified-reader@example.com' })
    const token = jwt.sign({ id: user._id, role: user.role, emailVerified: false }, process.env.JWT_SECRET)

    // GET /messages/conversations works without 403
    const convRes = await call('GET', '/messages/conversations', token)
    assert.equal(convRes.status, 200)
    assert.deepEqual(convRes.data.conversations, [])

    // GET /notifications/summary works without 403
    const notifRes = await call('GET', '/notifications/summary', token)
    assert.equal(notifRes.status, 200)
    assert.equal(typeof notifRes.data.unreadMessages, 'number')

    // POST /messages/conversations is blocked
    const hana = await tutorByName('Hana')
    const startRes = await call('POST', '/messages/conversations', token, { userId: hana.user._id })
    assert.equal(startRes.status, 403)
    assert.equal(startRes.data.code, 'EMAIL_NOT_VERIFIED')
  })
})

describe('tutor search and derived stats', () => {
  it('computes stats, badges and "fully booked" from bookings', async () => {
    const abebe = await tutorByName('Abebe')
    assert.equal(abebe.stats.completedSessions, 4)
    assert.equal(abebe.stats.repeatStudents, 1)
    assert.equal(abebe.stats.activeStudents, 2)
    assert.equal(abebe.availabilityStatus, 'fully_booked')
    assert.deepEqual(abebe.badges, ['verified', 'rising_talent'])
  })

  it('filters by mode and rate using the matching rate field and excludes unapproved tutors', async () => {
    // Dawit has in_person rate 300 but is pending verification, so he must not appear in search
    const pendingSearch = await call('GET', '/tutor/all?mode=in_person&maxRate=400')
    assert.deepEqual(pendingSearch.data.tutors.map(t => t.user.name), [])

    // Abebe is approved with in_person rate 500
    const approvedSearch = await call('GET', '/tutor/all?mode=in_person&maxRate=550')
    assert.deepEqual(approvedSearch.data.tutors.map(t => t.user.name), ['Abebe Kebede'])
  })

  it('generates public work history from finished bookings', async () => {
    const abebe = await tutorByName('Abebe')
    const res = await call('GET', `/tutor/${abebe._id}`)
    assert.equal(res.data.workHistory.length, 4)
    assert.ok(res.data.workHistory.some(w => w.rating === 5 && w.studentName === 'Meron G.'))
  })
})

describe('booking lifecycle', () => {
  it('locks the price, enforces who can act, and only allows forward steps', async () => {
    const hana = await tutorByName('Hana')
    const slot = nextSlot(1.5)

    const created = await call('POST', '/booking/hire', tokens.meron, { tutorId: hana._id, subject: 'English', mode: 'online', ...slot })
    assert.equal(created.status, 201)
    assert.equal(created.data.booking.hourlyRate, 400)
    assert.equal(created.data.booking.price, 600)
    const id = created.data.booking._id

    // Another tutor, or the student, cannot accept it
    assert.equal((await call('PUT', `/booking/status/${id}`, tokens.abebe, { status: 'accepted' })).status, 403)
    assert.equal((await call('PUT', `/booking/status/${id}`, tokens.meron, { status: 'accepted' })).status, 400)
    // Steps cannot be skipped
    assert.equal((await call('PUT', `/booking/status/${id}`, tokens.hana, { status: 'completed' })).status, 400)

    // Raising the profile rate does not touch the existing booking
    await call('PUT', '/tutor/profile', tokens.hana, { hourlyRateOnline: 900 })

    let res
    for (const status of ['accepted', 'paid', 'in_progress']) {
      res = await call('PUT', `/booking/status/${id}`, tokens.hana, { status })
      assert.equal(res.status, 200, `${status}: ${res.data.message}`)
    }
    assert.equal(res.data.booking.price, 600)
    assert.equal((await call('PUT', `/booking/status/${id}`, tokens.meron, { status: 'completed' })).status, 200)

    // Only the booking's student can review, and only once
    assert.equal((await call('POST', '/reviews', tokens.yonas, { bookingId: id, rating: 5 })).status, 404)
    assert.equal((await call('POST', '/reviews', tokens.meron, { bookingId: id, rating: 5, comment: 'Great' })).status, 201)
    assert.equal((await call('POST', '/reviews', tokens.meron, { bookingId: id, rating: 3 })).status, 400)

    const mine = await call('GET', '/booking/my-bookings', tokens.meron)
    assert.equal(mine.data.bookings.find(b => b._id === id).status, 'reviewed')

    await call('PUT', '/tutor/profile', tokens.hana, { hourlyRateOnline: 400 })
  })

  it('allows overlapping requests but not accepting a clash with a confirmed session', async () => {
    const hana = await tutorByName('Hana')
    const slot = nextSlot()
    const first = await call('POST', '/booking/hire', tokens.meron, { tutorId: hana._id, subject: 'English', mode: 'online', ...slot })
    const second = await call('POST', '/booking/hire', tokens.yonas, { tutorId: hana._id, subject: 'English', mode: 'online', ...slot })
    assert.equal(second.status, 201)

    assert.equal((await call('PUT', `/booking/status/${first.data.booking._id}`, tokens.hana, { status: 'accepted' })).status, 200)
    assert.equal((await call('PUT', `/booking/status/${second.data.booking._id}`, tokens.hana, { status: 'accepted' })).status, 409)

    // A new request for the confirmed slot is refused outright
    const third = await call('POST', '/booking/hire', tokens.liya, { tutorId: hana._id, subject: 'English', mode: 'online', ...slot })
    assert.equal(third.status, 409)
  })

  it('rejects modes the tutor does not offer and bookings by tutors', async () => {
    const hana = await tutorByName('Hana')
    assert.equal((await call('POST', '/booking/hire', tokens.meron, { tutorId: hana._id, subject: 'English', mode: 'in_person', ...nextSlot() })).status, 400)
    assert.equal((await call('POST', '/booking/hire', tokens.abebe, { tutorId: hana._id, subject: 'English', mode: 'online', ...nextSlot() })).status, 403)
  })
})

describe('jobs and proposals', () => {
  it('hires from a proposal at the proposed rate and declines the rest', async () => {
    const job = await call('POST', '/jobs', tokens.meron, { title: 'Chemistry help', description: 'Organic chemistry', subject: 'Chemistry', mode: 'online', budgetMin: 200, budgetMax: 500 })
    assert.equal(job.status, 201)
    const jobId = job.data.job._id

    assert.equal((await call('POST', `/jobs/${jobId}/proposals`, tokens.hana, { coverLetter: 'I can help', rate: 450 })).status, 201)
    assert.equal((await call('POST', `/jobs/${jobId}/proposals`, tokens.hana, { coverLetter: 'Again', rate: 450 })).status, 400)
    assert.equal((await call('POST', `/jobs/${jobId}/proposals`, tokens.sara, { coverLetter: 'Me too', rate: 300 })).status, 201)

    // Only the owner sees proposals
    const asOther = await call('GET', `/jobs/${jobId}`, tokens.abebe)
    assert.equal(asOther.data.proposals, undefined)
    const asOwner = await call('GET', `/jobs/${jobId}`, tokens.meron)
    assert.equal(asOwner.data.proposals.length, 2)

    const hanaProposal = asOwner.data.proposals.find(p => p.tutor.user.name === 'Hana Tesfaye')
    const hired = await call('POST', `/proposals/${hanaProposal._id}/hire`, tokens.meron, nextSlot())
    assert.equal(hired.status, 201)
    assert.equal(hired.data.booking.hourlyRate, 450)
    assert.equal(hired.data.booking.status, 'accepted')

    const after = await call('GET', `/jobs/${jobId}`, tokens.meron)
    assert.equal(after.data.job.status, 'hired')
    assert.equal(after.data.proposals.find(p => p.tutor.user.name === 'Sara Mohammed').status, 'declined')
  })
})

describe('messaging', () => {
  it('tracks unread messages and keeps conversations private', async () => {
    const hana = await tutorByName('Hana')
    const conv = await call('POST', '/messages/conversations', tokens.liya, { userId: hana.user._id })
    const id = conv.data.conversation._id
    await call('POST', `/messages/conversations/${id}`, tokens.liya, { body: 'Hello!' })

    assert.equal((await call('GET', '/notifications/summary', tokens.hana)).data.unreadMessages, 1)
    assert.equal((await call('GET', `/messages/conversations/${id}`, tokens.hana)).data.messages.length, 1)
    assert.equal((await call('GET', '/notifications/summary', tokens.hana)).data.unreadMessages, 0)
    assert.equal((await call('GET', `/messages/conversations/${id}`, tokens.yonas)).status, 404)
  })
})

describe('public highlights', () => {
  it('returns live counts, subjects and only positive reviews', async () => {
    const res = await call('GET', '/public/highlights')
    assert.equal(res.status, 200)
    assert.ok(res.data.tutors >= 4)
    assert.ok(res.data.subjects.some(s => s.name === 'Mathematics' && s.tutors === 2))
    assert.ok(res.data.reviews.length > 0 && res.data.reviews.every(r => r.rating >= 4 && r.comment))
  })
})

describe('admin', () => {
  it('is restricted to admins and can verify tutors', async () => {
    assert.equal((await call('GET', '/admin/stats', tokens.meron)).status, 403)
    const pending = await call('GET', '/admin/tutors?status=pending', tokens.admin)
    assert.equal(pending.data.tutors.length, 1)
    const res = await call('PUT', `/admin/tutors/${pending.data.tutors[0]._id}/verification`, tokens.admin, { status: 'approved' })
    assert.equal(res.data.tutor.verificationStatus, 'approved')
  })
})

describe('health and cors', () => {
  it('GET /api/health returns status ok', async () => {
    const res = await call('GET', '/health')
    assert.equal(res.status, 200)
    assert.deepEqual(res.data, { status: 'ok' })
  })

  it('allows requests from valid CORS origins', async () => {
    const origins = [
      'https://www.httpslamif-platfor.me',
      'https://httpslamif-platfor.me',
      'https://lamif-platform.vercel.app'
    ]
    for (const origin of origins) {
      const res = await fetch(baseUrl + '/health', {
        headers: { Origin: origin }
      })
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('access-control-allow-origin'), origin)
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
    }
  })

  it('handles CORS OPTIONS preflight requests for allowed origins', async () => {
    const res = await fetch(baseUrl + '/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://www.httpslamif-platfor.me',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    })
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://www.httpslamif-platfor.me')
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
    const methods = res.headers.get('access-control-allow-methods')
    assert.ok(methods.includes('POST') && methods.includes('GET') && methods.includes('OPTIONS'))
  })

  it('normalizes malformed double-slash paths like //api/health without skipping CORS', async () => {
    const rootUrl = baseUrl.replace(/\/api$/, '')
    const res = await fetch(rootUrl + '//api/health', {
      headers: { Origin: 'https://httpslamif-platfor.me' }
    })
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.deepEqual(json, { status: 'ok' })
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://httpslamif-platfor.me')
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
  })

  it('attaches CORS headers even on 404 and route errors', async () => {
    const res = await fetch(baseUrl + '/nonexistent-route-404', {
      headers: { Origin: 'https://www.httpslamif-platfor.me' }
    })
    assert.equal(res.status, 404)
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://www.httpslamif-platfor.me')
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
  })

  it('does not attach CORS headers to unauthorized origins without crashing', async () => {
    const res = await fetch(baseUrl + '/health', {
      headers: { Origin: 'https://malicious-site.example.com' }
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('access-control-allow-origin'), null)
  })
})

describe('tutor application and admin review system', () => {
  let applicantUser
  let applicantTutor
  let applicantToken

  before(async () => {
    // Register and verify a fresh tutor user
    await call('POST', '/auth/register', null, {
      name: 'Applicant Tutor',
      email: 'applicant@lamif.dev',
      password: 'password123',
      role: 'tutor'
    })
    applicantUser = await User.findOne({ email: 'applicant@lamif.dev' })
    await User.updateOne({ _id: applicantUser._id }, { emailVerified: true })

    const loginRes = await call('POST', '/auth/login', null, {
      email: 'applicant@lamif.dev',
      password: 'password123'
    })
    applicantToken = loginRes.data.token
  })

  it('allows saving an application draft with partial fields, which remains unlisted and unbookable', async () => {
    // Save draft with partial fields (no education or rates yet)
    const draftRes = await call('POST', '/tutor/profile', applicantToken, {
      action: 'draft',
      headline: 'Aspiring Economics Tutor',
      bio: 'Draft bio work in progress'
    })
    assert.equal(draftRes.status, 201)
    assert.equal(draftRes.data.tutor.verificationStatus, 'draft')
    applicantTutor = draftRes.data.tutor

    // Must not appear in public search
    const searchRes = await call('GET', '/tutor/all')
    assert.ok(!searchRes.data.tutors.some(t => t.user.name === 'Applicant Tutor'))

    // Must not appear in public subjects
    const subjRes = await call('GET', '/tutor/subjects')
    assert.ok(!subjRes.data.subjects.includes('Economics'))

    // Must not be directly bookable by students
    const slot = nextSlot()
    const bookRes = await call('POST', '/booking/hire', tokens.meron, {
      tutorId: applicantTutor._id,
      subject: 'Economics',
      startUtc: slot.startUtc,
      endUtc: slot.endUtc
    })
    assert.equal(bookRes.status, 404)

    // Cannot submit job proposals while in draft
    let job = await require('../models/Job').findOne({ status: 'open' })
    if (!job) {
      job = await require('../models/Job').create({
        student: (await User.findOne({ email: 'meron@lamif.dev' }))._id,
        title: 'Economics Help',
        description: 'Need assistance with microeconomics',
        subject: 'Economics',
        level: 'university',
        mode: 'online',
        status: 'open'
      })
    }
    const propRes = await call('POST', `/jobs/${job._id}/proposals`, applicantToken, {
      coverLetter: 'I would love to help with this course',
      rate: 300
    })
    assert.equal(propRes.status, 403)
  })

  it('validates submission fields and rejects duplicate ID or phone numbers', async () => {
    // Attempting to submit without mandatory fields should fail
    const invalidSubmit = await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      headline: 'Economics Specialist'
      // missing phone, idNumber, teachingStatement, agreementAccepted
    })
    assert.equal(invalidSubmit.status, 400)

    // Setup another approved tutor with existing ID and phone
    const TutorModel = require('../models/Tutor')
    const hana = await TutorModel.findOne({ user: (await User.findOne({ email: 'hana@lamif.dev' }))._id })
    hana.idNumber = 'ET-DUPLICATE-ID'
    hana.phoneNumber = '0911223344'
    await hana.save()

    // Test duplicate ID number rejection
    const duplicateIdSubmit = await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      phoneNumber: '0988776655',
      idNumber: 'ET-DUPLICATE-ID',
      idDocumentFile: 'test-id.png',
      bio: 'Certified tutor with deep subject knowledge.',
      education: 'BA Economics, AAU',
      subjects: ['Economics'],
      teachingStatement: 'My teaching philosophy is centered around active student participation.',
      agreementAccepted: true
    })
    assert.equal(duplicateIdSubmit.status, 409)

    // Test duplicate phone number rejection
    const duplicatePhoneSubmit = await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      phoneNumber: '0911223344',
      idNumber: 'ET-UNIQUE-ID-123',
      idDocumentFile: 'test-id.png',
      bio: 'Certified tutor with deep subject knowledge.',
      education: 'BA Economics, AAU',
      subjects: ['Economics'],
      teachingStatement: 'My teaching philosophy is centered around active student participation.',
      agreementAccepted: true
    })
    assert.equal(duplicatePhoneSubmit.status, 409)
  })

  it('submits valid application, keeps ID/certs private, and sanitizes public profile', async () => {
    const fs = require('fs')
    const path = require('path')
    const TutorModel = require('../models/Tutor')

    // Create a mock private ID document file in uploads_private
    const privateDir = path.join(__dirname, '..', 'uploads_private')
    if (!fs.existsSync(privateDir)) fs.mkdirSync(privateDir, { recursive: true })
    const mockFilename = 'idDocument-test-private.png'
    fs.writeFileSync(path.join(privateDir, mockFilename), 'fake-image-bytes')

    // Submit valid application
    const submitRes = await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      phoneNumber: '0977665544',
      idNumber: 'ET-UNIQUE-9988',
      idDocumentFile: mockFilename,
      headline: 'Economics & Statistics Tutor',
      bio: 'Experienced educator preparing high school and university students.',
      education: 'BSc in Economics, Addis Ababa University',
      subjects: ['Economics'],
      teachingModes: ['online'],
      hourlyRateOnline: 350,
      teachingStatement: 'Empowering students to think critically and solve real-world problems.',
      agreementAccepted: true
    })
    assert.equal(submitRes.status, 200)
    assert.equal(submitRes.data.tutor.verificationStatus, 'submitted')
    assert.ok(submitRes.data.tutor.submittedAt)

    // Attach private document filename and a certificate
    await TutorModel.updateOne({ _id: applicantTutor._id }, {
      idDocumentFile: mockFilename,
      certificates: [{ name: 'Certified Macroeconomics Instructor', issuer: 'AAU', year: 2023, file: mockFilename }]
    })

    // Private document route access control:
    // 1. Unauthenticated request rejected
    const unauthRes = await fetch(`${baseUrl}/tutor/${applicantTutor._id}/document/id`)
    assert.equal(unauthRes.status, 401)

    // 2. Student (Meron) forbidden from viewing ID document
    const studentRes = await fetch(`${baseUrl}/tutor/${applicantTutor._id}/document/id`, {
      headers: { Authorization: `Bearer ${tokens.meron}` }
    })
    assert.equal(studentRes.status, 403)

    // 3. Tutor owner can view their own ID document
    const ownerRes = await fetch(`${baseUrl}/tutor/${applicantTutor._id}/document/id`, {
      headers: { Authorization: `Bearer ${applicantToken}` }
    })
    assert.equal(ownerRes.status, 200)

    // 4. Admin can view the ID document
    const adminRes = await fetch(`${baseUrl}/tutor/${applicantTutor._id}/document/id`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    })
    assert.equal(adminRes.status, 200)

    // 5. Public GET /tutor/:id for submitted tutor is hidden (404) for students
    const publicViewRes = await call('GET', `/tutor/${applicantTutor._id}`, tokens.meron)
    assert.equal(publicViewRes.status, 404)
  })

  it('handles admin review decisions: under_review, needs_changes, rejected, cooldown and approval', async () => {
    const TutorModel = require('../models/Tutor')

    // Admin views queue
    const queue = await call('GET', '/admin/tutors?status=submitted', tokens.admin)
    assert.ok(queue.data.tutors.some(t => t.user.email === 'applicant@lamif.dev'))

    // Admin marks under_review
    const underReview = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'under_review'
    })
    assert.equal(underReview.status, 200)
    assert.equal(underReview.data.tutor.verificationStatus, 'under_review')

    // Admin requests changes without note fails
    const noNoteRes = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'needs_changes'
    })
    assert.equal(noNoteRes.status, 400)

    // Admin requests changes with note
    const changesRes = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'needs_changes',
      note: 'Please provide more details on university level coursework.'
    })
    assert.equal(changesRes.status, 200)
    assert.equal(changesRes.data.tutor.verificationStatus, 'needs_changes')
    assert.equal(changesRes.data.tutor.adminFeedback.note, 'Please provide more details on university level coursework.')

    // Applicant resubmits
    const resubmitRes = await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      agreementAccepted: true
    })
    assert.equal(resubmitRes.status, 200)
    assert.equal(resubmitRes.data.tutor.verificationStatus, 'submitted')

    // Admin rejects without reason fails
    const noReasonRes = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'rejected'
    })
    assert.equal(noReasonRes.status, 400)

    // Admin rejects with reason
    const rejectRes = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'rejected',
      reason: 'Provided credentials could not be verified by faculty.'
    })
    assert.equal(rejectRes.status, 200)
    assert.equal(rejectRes.data.tutor.verificationStatus, 'rejected')
    assert.ok(rejectRes.data.tutor.reapplyAllowedAt)

    // Tutor cannot reapply before cooldown
    const earlyReapply = await call('POST', '/tutor/reapply', applicantToken)
    assert.equal(earlyReapply.status, 400)

    // Fast-forward cooldown to the past
    await TutorModel.updateOne({ _id: applicantTutor._id }, {
      reapplyAllowedAt: new Date(Date.now() - 1000)
    })

    // Reapply succeeds and resets status to draft
    const reapplyRes = await call('POST', '/tutor/reapply', applicantToken)
    assert.equal(reapplyRes.status, 200)
    assert.equal(reapplyRes.data.tutor.verificationStatus, 'draft')

    // Applicant resubmits
    await call('PUT', '/tutor/profile', applicantToken, {
      action: 'submit',
      agreementAccepted: true
    })

    // Admin approves application
    const approveRes = await call('PUT', `/admin/tutors/${applicantTutor._id}/verification`, tokens.admin, {
      status: 'approved'
    })
    assert.equal(approveRes.status, 200)
    assert.equal(approveRes.data.tutor.verificationStatus, 'approved')

    // Now approved tutor appears in search
    const searchAfterApprove = await call('GET', '/tutor/all')
    const found = searchAfterApprove.data.tutors.find(t => t.user.name === 'Applicant Tutor')
    assert.ok(found)
    // Sensitive fields must be stripped on public search
    assert.equal(found.idNumber, undefined)
    assert.equal(found.phoneNumber, undefined)
    assert.equal(found.idDocumentFile, undefined)
    assert.equal(found.adminFeedback, undefined)

    // Now Economics appears in subjects
    const subjectsAfterApprove = await call('GET', '/tutor/subjects')
    assert.ok(subjectsAfterApprove.data.subjects.includes('Economics'))

    // Now students can successfully book sessions with the approved tutor
    const slot = nextSlot()
    const bookingRes = await call('POST', '/booking/hire', tokens.meron, {
      tutorId: applicantTutor._id,
      subject: 'Economics',
      mode: 'online',
      startUtc: slot.startUtc,
      endUtc: slot.endUtc
    })
    assert.equal(bookingRes.status, 201)
    assert.equal(bookingRes.data.booking.subject, 'Economics')

    // Now approved tutor can submit proposals on open jobs
    const job = await require('../models/Job').findOne({ status: 'open' })
    const proposalRes = await call('POST', `/jobs/${job._id}/proposals`, applicantToken, {
      coverLetter: 'I am certified and ready to teach!',
      rate: 350
    })
    assert.equal(proposalRes.status, 201)
  })
})
