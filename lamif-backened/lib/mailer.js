const nodemailer = require('nodemailer')

function getTransporter() {
  const apiKey = process.env.MAIL_API_KEY
  const host = process.env.MAIL_HOST || 'smtp.resend.com'
  const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 465
  const user = process.env.MAIL_USER || (apiKey?.startsWith('re_') ? 'resend' : 'apikey')

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: apiKey
    }
  })
}

async function sendVerificationEmail(to, code) {
  const apiKey = process.env.MAIL_API_KEY
  const from = process.env.MAIL_FROM

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service configuration missing: MAIL_API_KEY and MAIL_FROM must be set in production')
    }
    console.log(`[MAILER DEV] To: ${to} | Verification Code: ${code}`)
    return { success: true, simulated: true }
  }

  const transporter = getTransporter()
  const mailOptions = {
    from,
    to,
    subject: 'Your LAMIF Verification Code',
    text: `Your 6-digit LAMIF verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #18181b; margin-top: 0;">Verify your email</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.5;">Welcome to LAMIF! Use the code below to verify your email address and activate your account:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; padding: 18px; background: #f4f4f5; text-align: center; border-radius: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin-bottom: 0;">This code will expire in 10 minutes. If you did not create a LAMIF account, you can safely ignore this email.</p>
      </div>
    `
  }

  const info = await transporter.sendMail(mailOptions)
  return { success: true, messageId: info.messageId }
}

module.exports = {
  sendVerificationEmail
}
