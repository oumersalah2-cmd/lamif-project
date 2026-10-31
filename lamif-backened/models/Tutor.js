const mongoose = require('mongoose')

const TEACHING_MODES = ['online', 'in_person']

// A recurring weekly window, in Addis Ababa time (EAT, UTC+3)
const slotSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
  start: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true }, // "HH:MM"
  end: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true }
}, { _id: false })

const tutorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  headline: {
    type: String,
    default: '',
    maxlength: 120
  },
  bio: {
    type: String,
    required: true
  },
  subjects: {
    type: [String],
    required: true,
    validate: [list => list.length > 0, 'Add at least one subject']
  },
  hourlyRateOnline: {
    type: Number,
    min: 0
  },
  hourlyRateInPerson: {
    type: Number,
    min: 0
  },
  teachingModes: {
    type: [{ type: String, enum: TEACHING_MODES }],
    default: ['online']
  },
  education: {
    type: String,
    required: true
  },
  languages: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: ''
  },
  cvUrl: {
    type: String,
    default: ''
  },
  profilePictureUrl: {
    type: String,
    default: ''
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  // How many in-progress students the tutor can take before showing "Fully Booked"
  maxActiveStudents: {
    type: Number,
    min: 1,
    default: 5
  },
  availability: {
    type: [slotSchema],
    default: []
  },
  // Single rate from before online/in-person pricing; read-only, kept so old profiles still load
  hourlyRate: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

tutorSchema.pre('validate', function () {
  if (this.hourlyRateOnline == null && this.hourlyRate != null) {
    this.hourlyRateOnline = this.hourlyRate
  }
  if (!this.teachingModes || this.teachingModes.length === 0) {
    this.teachingModes = ['online']
  }
  if (this.teachingModes.includes('online') && this.hourlyRateOnline == null) {
    this.invalidate('hourlyRateOnline', 'Set an hourly rate for online sessions')
  }
  if (this.teachingModes.includes('in_person') && this.hourlyRateInPerson == null) {
    this.invalidate('hourlyRateInPerson', 'Set an hourly rate for in-person sessions')
  }
  for (const slot of this.availability) {
    if (slot.start >= slot.end) {
      this.invalidate('availability', 'Each availability slot must end after it starts')
    }
  }
})

tutorSchema.methods.rateFor = function (mode) {
  return mode === 'in_person' ? this.hourlyRateInPerson : this.hourlyRateOnline
}

const Tutor = mongoose.model('Tutor', tutorSchema)

Tutor.TEACHING_MODES = TEACHING_MODES

module.exports = Tutor
