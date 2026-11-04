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
    host: process.env.SMTP_HOST.trim(),
    port,
    secure
  }

  if (process.env.SMTP_USER || process.env.SMTP_PASS) {
    let user = (process.env.SMTP_USER || '').trim()
    const pass = (process.env.SMTP_PASS || '').trim()

    // Resend SMTP requires the exact username 'resend'
    const isResend = process.env.SMTP_HOST.includes('resend') || pass.startsWith('re_')
    if (isResend) {
      user = 'resend'
    }

    transportOptions.auth = { user, pass }
  }

  console.log(`[MAILER] Sending email to ${to} via ${process.env.SMTP_HOST}:${port} (secure=${secure}, user=${transportOptions.auth?.user})`)

  const transporter = nodemailer.createTransport(transportOptions)
  try {
    const info = await transporter.sendMail({
      from: (process.env.MAIL_FROM || 'LAMIF <onboarding@resend.dev>').trim(),
      to,
      subject,
      text,
      html
    })
    console.log(`[MAILER] Email sent successfully to ${to}: messageId=${info.messageId}`)
    return info
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${to}:`, err.message || err)
    throw err
  }
}

module.exports = { sendMail }
