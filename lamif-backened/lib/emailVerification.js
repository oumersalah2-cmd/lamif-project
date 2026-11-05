const crypto = require('crypto')
const mailer = require('./mailer')
const { getPrimaryClientUrl } = require('./corsConfig')

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex')
  user.verificationTokenHash = hashToken(token)
  user.emailVerified = false
  user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  const clientUrl = getPrimaryClientUrl()
  const link = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`
  const text = `Verify your LAMIF email address by opening this link:\n\n${link}\n\nThis link expires in 24 hours.`
  const html = `<p>Verify your LAMIF email address by clicking the link below:</p><p><a href="${link}">Verify your email</a></p><p>This link expires in 24 hours.</p>`

  await mailer.sendMail({
    to: user.email,
    subject: 'Verify your LAMIF email',
    text,
    html
  })

  return token
}

module.exports = { issueVerification, hashToken }
