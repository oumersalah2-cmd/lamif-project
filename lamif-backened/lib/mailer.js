const nodemailer = require('nodemailer')

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[MAILER DEV]', { to, subject, text })
    }
    return
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const transportOptions = {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true'
  }

  if (process.env.SMTP_USER || process.env.SMTP_PASS) {
    transportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }

  const transporter = nodemailer.createTransport(transportOptions)
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'LAMIF <no-reply@lamif.dev>',
    to,
    subject,
    text,
    html
  })
}

module.exports = { sendMail }
