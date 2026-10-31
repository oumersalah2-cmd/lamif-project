const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const protect = require('../middleware/authMiddleware')

router.use(protect)

router.get('/', async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50)
  res.json({ notifications })
})

// Badge counts for the navbar, polled by the frontend
router.get('/summary', async (req, res) => {
  const conversationIds = await Conversation.find({ participants: req.user.id }).distinct('_id')
  const [unreadNotifications, unreadMessages] = await Promise.all([
    Notification.countDocuments({ user: req.user.id, read: false }),
    Message.countDocuments({ conversation: { $in: conversationIds }, sender: { $ne: new mongoose.Types.ObjectId(req.user.id) }, readAt: null })
  ])
  res.json({ unreadNotifications, unreadMessages })
})

router.put('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true })
  res.json({ message: 'All caught up' })
})

router.put('/:id/read', async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { read: true })
  res.json({ message: 'Marked as read' })
})

module.exports = router
