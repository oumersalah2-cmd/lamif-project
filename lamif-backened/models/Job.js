const mongoose = require('mongoose')

// A tutoring request posted by a student; tutors respond with proposals
const jobSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: [
      'kg',
      'primary',
      'primary_lower',
      'primary_upper',
      'secondary',
      'preparatory',
      'university',
      'test_prep',
      'tech_skills',
      'professional',
      'other'
    ],
    default: 'other'
  },
  mode: {
    type: String,
    enum: ['online', 'in_person', 'either'],
    default: 'either'
  },
  // Hourly budget range in ETB
  budgetMin: {
    type: Number,
    min: 0
  },
  budgetMax: {
    type: Number,
    min: 0
  },
  location: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'hired', 'closed'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

jobSchema.pre('validate', function () {
  if (this.budgetMin != null && this.budgetMax != null && this.budgetMin > this.budgetMax) {
    this.invalidate('budgetMax', 'Maximum budget must be at least the minimum')
  }
})

jobSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('Job', jobSchema)
