const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
})

conversationSchema.index({ participants: 1, lastMessageAt: -1 })

module.exports = mongoose.model('Conversation', conversationSchema)
