// Demo data for local development. Only runs against an empty database.
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Tutor = require('./models/Tutor')
const Booking = require('./models/Booking')
const Review = require('./models/Review')
const Job = require('./models/Job')
const Proposal = require('./models/Proposal')
const Conversation = require('./models/Conversation')
const Message = require('./models/Message')

const DEMO_PASSWORD = 'password123'
const HOUR = 3600000
const DAY = 24 * HOUR

const weekdays = (start, end) => [1, 2, 3, 4, 5].map(day => ({ day, start, end }))

async function seed() {
  if (await User.estimatedDocumentCount() > 0) {
    console.log('Database not empty, skipping seed')
    return
  }

  const password = await bcrypt.hash(DEMO_PASSWORD, 10)
  const makeUser = (name, email, role) => ({ name, email, role, password, emailVerified: true })

  const [, abebe, hana, dawit, sara, student1, student2, student3] = await User.create([
    makeUser('LAMIF Admin', 'admin@lamif.dev', 'admin'),
    makeUser('Abebe Kebede', 'abebe@lamif.dev', 'tutor'),
    makeUser('Hana Tesfaye', 'hana@lamif.dev', 'tutor'),
    makeUser('Dawit Alemu', 'dawit@lamif.dev', 'tutor'),
    makeUser('Sara Mohammed', 'sara@lamif.dev', 'tutor'),
    makeUser('Meron Girma', 'meron@lamif.dev', 'student'),
    makeUser('Yonas Bekele', 'yonas@lamif.dev', 'student'),
    makeUser('Liya Haile', 'liya@lamif.dev', 'student')
  ])

  const [abebeT, hanaT, dawitT, saraT] = await Tutor.create([
    {
      user: abebe._id,
      headline: 'Mathematics & Physics tutor | National exam specialist',
      bio: 'Eight years preparing Grade 12 students for the Ethiopian national exam. I focus on understanding, not memorising: every session ends with problems you solve yourself.',
      subjects: ['Mathematics', 'Physics'],
      teachingModes: ['online', 'in_person'],
      hourlyRateOnline: 350,
      hourlyRateInPerson: 500,
      education: 'MSc Applied Mathematics, Addis Ababa University',
      languages: ['Amharic', 'English'],
      location: 'Addis Ababa',
      verificationStatus: 'approved',
      maxActiveStudents: 2,
      availability: [...weekdays('16:00', '20:00'), { day: 6, start: '09:00', end: '13:00' }]
    },
    {
      user: hana._id,
      headline: 'English language & IELTS coach',
      bio: 'Certified English teacher helping students and professionals with grammar, speaking confidence and IELTS/TOEFL preparation.',
      subjects: ['English', 'IELTS'],
      teachingModes: ['online'],
      hourlyRateOnline: 400,
      education: 'BA English Language & Literature, Bahir Dar University; CELTA',
      languages: ['Amharic', 'English', 'Afaan Oromo'],
      location: 'Bahir Dar',
      verificationStatus: 'approved',
      availability: [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, start: '00:00', end: '23:59' }))
    },
    {
      user: dawit._id,
      headline: 'Chemistry & Biology for high school',
      bio: 'Medical student who loves teaching science. Clear explanations, past exam papers and lots of diagrams.',
      subjects: ['Chemistry', 'Biology'],
      teachingModes: ['in_person'],
      hourlyRateInPerson: 300,
      education: 'Medicine (5th year), Jimma University',
      languages: ['Amharic', 'English'],
      location: 'Jimma',
      verificationStatus: 'pending',
      availability: weekdays('18:00', '21:00')
    },
    {
      user: sara._id,
      headline: 'Programming tutor: Python, web development',
      bio: 'Software engineer teaching Python, JavaScript and computer science fundamentals to beginners and university students.',
      subjects: ['Programming', 'Computer Science', 'Mathematics'],
      teachingModes: ['online'],
      hourlyRateOnline: 600,
      education: 'BSc Software Engineering, AAiT',
      languages: ['Amharic', 'English', 'Arabic'],
      location: 'Addis Ababa',
      verificationStatus: 'approved',
      availability: [{ day: 6, start: '08:00', end: '18:00' }, { day: 0, start: '08:00', end: '18:00' }]
    }
  ])

  const now = Date.now()
  const session = (student, tutor, subject, rate, daysAgo, status, mode = 'online') => {
    const startUtc = new Date(now - daysAgo * DAY)
    return {
      student: student._id,
      tutor: tutor._id,
      subject,
      message: `Help with ${subject}`,
      mode,
      startUtc,
      endUtc: new Date(startUtc.getTime() + 2 * HOUR),
      hourlyRate: rate,
      price: rate * 2,
      status,
      statusHistory: ['requested', 'accepted', 'paid', 'in_progress', 'completed', 'reviewed']
        .slice(0, ['requested', 'accepted', 'paid', 'in_progress', 'completed', 'reviewed'].indexOf(status) + 1)
        .map(s => ({ status: s, by: student._id }))
    }
  }

  const finished = await Booking.create([
    session(student1, abebeT, 'Mathematics', 350, 40, 'reviewed'),
    session(student1, abebeT, 'Mathematics', 350, 33, 'reviewed'),
    session(student2, abebeT, 'Physics', 500, 25, 'reviewed', 'in_person'),
    session(student3, abebeT, 'Mathematics', 350, 12, 'completed'),
    session(student2, hanaT, 'IELTS', 400, 20, 'reviewed'),
    session(student3, hanaT, 'English', 400, 9, 'reviewed'),
    session(student1, saraT, 'Programming', 600, 15, 'reviewed')
  ])

  await Review.create([
    { booking: finished[0]._id, reviewer: student1._id, tutor: abebeT._id, rating: 5, comment: 'Abebe explained calculus better than any teacher I have had. My mock exam score went from 52 to 81.' },
    { booking: finished[1]._id, reviewer: student1._id, tutor: abebeT._id, rating: 5, comment: 'Second session was just as good. Very patient.' },
    { booking: finished[2]._id, reviewer: student2._id, tutor: abebeT._id, rating: 4, comment: 'Great physics session, started a bit late.', tutorReply: 'Thanks Yonas, sorry about the traffic, see you next week!' },
    { booking: finished[4]._id, reviewer: student2._id, tutor: hanaT._id, rating: 5, comment: 'Got band 7.5 in IELTS speaking. Thank you Hana!' },
    { booking: finished[5]._id, reviewer: student3._id, tutor: hanaT._id, rating: 5, comment: 'Fun and very practical lessons.' },
    { booking: finished[6]._id, reviewer: student1._id, tutor: saraT._id, rating: 4, comment: 'Clear Python intro. Would like more homework.' }
  ])

  // Live and upcoming engagements: Abebe is "Working now" with 2 students, which fills his capacity of 2
  const upcoming = (student, tutor, subject, rate, daysAhead, status, mode = 'online') => {
    const startUtc = new Date(now + daysAhead * DAY)
    return { ...session(student, tutor, subject, rate, 0, status, mode), startUtc, endUtc: new Date(startUtc.getTime() + HOUR), price: rate }
  }
  await Booking.create([
    { ...session(student2, abebeT, 'Physics', 500, 0, 'in_progress', 'in_person'), startUtc: new Date(now - HOUR / 2), endUtc: new Date(now + HOUR) },
    { ...session(student1, abebeT, 'Mathematics', 350, 0, 'in_progress'), startUtc: new Date(now - 3 * DAY), endUtc: new Date(now - 3 * DAY + HOUR) },
    upcoming(student3, hanaT, 'English', 400, 2, 'requested'),
    upcoming(student1, hanaT, 'IELTS', 400, 4, 'accepted'),
    upcoming(student2, saraT, 'Programming', 600, 3, 'paid')
  ])

  const [mathJob] = await Job.create([
    {
      student: student3._id,
      title: 'Grade 12 maths tutor for national exam preparation',
      description: 'I need help with calculus and statistics, 3 sessions a week until the national exam. I prefer evenings.',
      subject: 'Mathematics',
      level: 'preparatory',
      mode: 'either',
      budgetMin: 250,
      budgetMax: 450,
      location: 'Addis Ababa'
    },
    {
      student: student2._id,
      title: 'Learn Python for a university data project',
      description: 'Looking for someone to teach me pandas and basic data visualisation over 4-5 sessions.',
      subject: 'Programming',
      level: 'university',
      mode: 'online',
      budgetMin: 400,
      budgetMax: 700
    }
  ])

  await Proposal.create({
    job: mathJob._id,
    tutor: saraT._id,
    coverLetter: 'Hi Liya, I tutor maths alongside programming and have helped several students through calculus. I can do Tuesday, Thursday and Saturday evenings.',
    rate: 420
  })

  const conversation = await Conversation.create({ participants: [student1._id, abebe._id] })
  await Message.create([
    { conversation: conversation._id, sender: student1._id, body: 'Hi Abebe, can we focus on integration next session?', readAt: new Date() },
    { conversation: conversation._id, sender: abebe._id, body: 'Of course! Bring the exercises from chapter 4 and we will go through them.' }
  ])
  conversation.lastMessage = 'Of course! Bring the exercises from chapter 4 and we will go through them.'
  conversation.lastMessageAt = new Date()
  await conversation.save()

  console.log(`Seeded demo data. Log in with any @lamif.dev account, password "${DEMO_PASSWORD}":`)
  console.log('  admin@lamif.dev | tutors: abebe, hana, dawit, sara | students: meron, yonas, liya')
}

module.exports = seed
