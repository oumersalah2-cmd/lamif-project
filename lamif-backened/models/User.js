const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'tutor', 'admin'],
    required: true
  },
  savedTutors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor'
  }],
  emailVerified: {
    type: Boolean,
    default: true
  },
  telegramChatId: {
    type: String
  },
  telegramUsername: {
    type: String
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'telegram', 'manual', null],
    default: null
  },
  verificationTokenHash: {
    type: String
  },
  verificationCodeHash: {
    type: String
  },
  verificationExpires: {
    type: Date
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  verificationLastSentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User
