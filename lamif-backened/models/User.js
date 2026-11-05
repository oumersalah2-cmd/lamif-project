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
    required: function () {
      return !this.googleId && this.authProvider !== 'google'
    }
  },
  role: {
    type: String,
    enum: ['student', 'tutor', 'admin'],
    required: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  avatar: {
    type: String
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
    enum: ['email', 'telegram', 'manual', 'google', null],
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
