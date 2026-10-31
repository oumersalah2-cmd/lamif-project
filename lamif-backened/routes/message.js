const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const User = require('../models/User')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')

router.use(protect)

async function myConversation(req) {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id })
    .populate('participants', 'name role')
  if (!conversation) throw httpError(404, 'Conversation not found')
  return conversation
}

const otherParticipant = (conversation, userId) =>
  conversation.participants.find(p => String(p._id) !== userId)

router.get('/conversations', async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user.id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name role')

  const unreadRows = await Message.aggregate([
    { $match: { conversation: { $in: conversations.map(c => c._id) }, readAt: null, sender: { $ne: new mongoose.Types.ObjectId(req.user.id) } } },
    { $group: { _id: '$conversation', count: { $sum: 1 } } }
  ])
  const unread = new Map(unreadRows.map(r => [String(r._id), r.count]))

  res.json({
    conversations: conversations.map(c => ({
      _id: c._id,
      other: otherParticipant(c, req.user.id),
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: unread.get(String(c._id)) || 0
    }))
  })
})

// Find or start the conversation with another user
router.post('/conversations', async (req, res) => {
  const { userId } = req.body
  if (userId === req.user.id) throw httpError(400, 'You cannot message yourself')
  const other = await User.findById(userId)
  if (!other) throw httpError(404, 'User not found')

  let conversation = await Conversation.findOne({ participants: { $all: [req.user.id, userId], $size: 2 } })
  if (!conversation) conversation = await Conversation.create({ participants: [req.user.id, userId] })
  res.json({ conversation })
})

// Reading the thread marks the other person's messages as read
router.get('/conversations/:id', async (req, res) => {
  const conversation = await myConversation(req)
  await Message.updateMany({ conversation: conversation._id, sender: { $ne: req.user.id }, readAt: null }, { readAt: new Date() })
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 }).limit(500)
  res.json({ conversation: { _id: conversation._id, other: otherParticipant(conversation, req.user.id) }, messages })
})

router.post('/conversations/:id', async (req, res) => {
  const conversation = await myConversation(req)
  const message = await Message.create({ conversation: conversation._id, sender: req.user.id, body: req.body.body })
  conversation.lastMessage = message.body.slice(0, 140)
  conversation.lastMessageAt = message.createdAt
  await conversation.save()
  res.status(201).json({ message })
})

module.exports = router
