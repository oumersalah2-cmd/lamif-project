const nodemailer = require('nodemailer')

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[MAILER DEV] SMTP_HOST not set — printing email to console instead:')
      console.log('[MAILER DEV]', { to, subject, text })
    }
    return
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  const transportOptions = {
    host: process.env.SMTP_HOST,
    port,
    secure
  }

  if (process.env.SMTP_USER || process.env.SMTP_PASS) {
    transportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }

  console.log(`[MAILER] Sending email to ${to} via ${process.env.SMTP_HOST}:${port} (secure=${secure})`)

  const transporter = nodemailer.createTransport(transportOptions)
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'LAMIF <no-reply@lamif.dev>',
    to,
    subject,
    text,
    html
  })
  console.log(`[MAILER] Email sent successfully: messageId=${info.messageId}`)
}

module.exports = { sendMail }
