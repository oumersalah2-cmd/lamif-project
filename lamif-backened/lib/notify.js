const Notification = require('../models/Notification')

// Fire-and-forget: a failed notification must never fail the action that caused it
const notify = async (userId, type, message, link = '') => {
  try {
    await Notification.create({ user: userId, type, message, link })
  } catch (error) {
    console.error('Failed to create notification:', error.message)
  }
}

module.exports = notify
