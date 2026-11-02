// End-to-end API tests against an in-memory MongoDB seeded with the demo data.
// Run with: npm test
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test-secret'
const app = require('../app')
const seed = require('../seed')

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

describe('auth', () => {
  it('rejects self-registration as admin', async () => {
    const res = await call('POST', '/auth/register', null, { name: 'X', email: 'x@example.com', password: 'secret1', role: 'admin' })
    assert.equal(res.status, 400)
  })

  it('normalises email case on register and login', async () => {
    const res = await call('POST', '/auth/register', null, { name: 'Case Test', email: 'Case@Example.com', password: 'secret1', role: 'student' })
    assert.equal(res.status, 201)
    const login = await call('POST', '/auth/login', null, { email: 'CASE@example.com', password: 'secret1' })
    assert.equal(login.status, 200)
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

  it('filters by mode and rate using the matching rate field', async () => {
    const res = await call('GET', '/tutor/all?mode=in_person&maxRate=400')
    assert.deepEqual(res.data.tutors.map(t => t.user.name), ['Dawit Alemu'])
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
    const res = await fetch(baseUrl + '/health', {
      headers: { Origin: 'https://lamif-platform.vercel.app' }
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://lamif-platform.vercel.app')
  })
})

