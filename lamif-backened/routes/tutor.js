const express = require('express')
const router = express.Router()
const Tutor = require('../models/Tutor')
const protect = require('../middleware/authMiddleware')
const upload = require('../middleware/upload')

router.post('/profile', protect, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 }
]), async (req, res) => {
  try {
    let { bio, subjects, hourlyRate, education } = req.body
    
    // Parse subjects if it's a string from FormData
    if (typeof subjects === 'string') {
      subjects = subjects.split(',').map(s => s.trim())
    }

    const existingProfile = await Tutor.findOne({ user: req.user.id })
    if (existingProfile) {
      return res.status(400).json({ message: 'Tutor profile already exists' })
    }

    const tutor = new Tutor({
      user: req.user.id,
      bio,
      subjects,
      hourlyRate,
      education,
      cvUrl: req.files && req.files.cv ? `/uploads/${req.files.cv[0].filename}` : '',
      profilePictureUrl: req.files && req.files.profilePicture ? `/uploads/${req.files.profilePicture[0].filename}` : ''
    })

    await tutor.save()

    res.status(201).json({ message: 'Tutor profile created successfully', tutor })

  } catch (error) {
    console.error('Error creating tutor profile:', error. message)
    res.status(500).json({ message: 'Server error', error })
  }
})

router.get('/all', async (req, res) => {
  try {
    const tutors = await Tutor.find({ isAvailable: true }).populate('user', 'name email')
    res.status(200).json({ tutors })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id).populate('user', 'name email')

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' })
    }

    res.status(200).json({ tutor })

  } catch (error) {
    console.error('Error:', error.message)
    res.status(500).json({ message: 'Server error', error })
  }
})

module.exports = router