const User = require('../models/User')
const { hashToken } = require('./emailVerification')

let pollingActive = false
let pollingAbort = false

async function sendTelegramMessage(chatId, htmlText) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML'
      })
    })
  } catch (err) {
    console.error('[TELEGRAM BOT] Failed to send message:', err.message || err)
  }
}

async function handleTelegramUpdate(update) {
  if (!update || !update.message || !update.message.text) return

  const message = update.message
  const text = message.text.trim()
  const chatId = message.chat.id

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/)
    if (parts.length > 1) {
      const token = parts[1].trim()
      const tokenHash = hashToken(token)

      const user = await User.findOne({ verificationTokenHash: tokenHash })

      if (!user) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Invalid or expired link.</b>\n\nThis verification link has already been used or has expired. Please log in or request a new verification link on the LAMIF website.'
        )
        return
      }

      if (user.verificationExpires && user.verificationExpires <= new Date()) {
        await sendTelegramMessage(
          chatId,
          '⏳ <b>Verification link expired.</b>\n\nThis verification link has expired. Please visit the LAMIF website to request a fresh link.'
        )
        return
      }

      user.emailVerified = true
      user.verificationMethod = 'telegram'
      user.telegramChatId = String(chatId)
      user.telegramUsername = message.from?.username || ''
      user.verificationTokenHash = undefined
      user.verificationExpires = undefined
      await user.save()

      console.log(`[TELEGRAM BOT] Successfully verified user: ${user.email} (tg: @${user.telegramUsername || chatId})`)

      await sendTelegramMessage(
        chatId,
        `🎉 <b>Verification Successful!</b>\n\nWelcome to LAMIF, <b>${user.name}</b>!\nYour account (<code>${user.email}</code>) is now fully verified.\n\nYou can return to your browser and log in.`
      )
    } else {
      await sendTelegramMessage(
        chatId,
        '👋 <b>Welcome to LAMIF Verification Bot!</b>\n\nTo verify your account, please click the <b>"Verify via Telegram"</b> button on the LAMIF registration page in your browser.'
      )
    }
  }
}

async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.log('[TELEGRAM BOT] TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.')
    return
  }

  // Ensure any previous webhook is deleted so getUpdates polling works cleanly
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`)
  } catch (err) {
    console.warn('[TELEGRAM BOT] Could not delete webhook:', err.message)
  }

  if (pollingActive) return
  pollingActive = true
  pollingAbort = false

  console.log(`[TELEGRAM BOT] Polling started for @${process.env.TELEGRAM_BOT_USERNAME || 'lamif_verify_bot'}`)

  let offset = 0
  while (pollingActive && !pollingAbort) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`)
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 4000))
        continue
      }
      const data = await res.json()
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1
          try {
            await handleTelegramUpdate(update)
          } catch (err) {
            console.error('[TELEGRAM BOT] Error processing update:', err)
          }
        }
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

function stopTelegramBot() {
  pollingAbort = true
  pollingActive = false
}

module.exports = {
  startTelegramBot,
  stopTelegramBot,
  handleTelegramUpdate,
  sendTelegramMessage
}
