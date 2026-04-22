const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const protect = require('../middleware/authMiddleware')

router.post('/hire', protect, async (req, res) => {
  try {
    const { tutorId, subject, message } = req.body

    const booking = new Booking({
      student: req.user.id,
      tutor: tutorId,
      subject,
      message
    })

    await booking.save()

    res.status(201).json({ message: 'Booking request sent successfully', booking })

  } catch (error) {
    console.log('Booking error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ student: req.user.id })
      .populate({
        path: 'tutor',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('student', 'name email')

    res.status(200).json({ bookings })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get('/tutor-bookings', protect, async (req, res) => {
  try {
    const Tutor = require('../models/Tutor')
    const tutorProfile = await Tutor.findOne({ user: req.user.id })
    
    if (!tutorProfile) {
      return res.status(404).json({ message: 'Tutor profile not found' })
    }

    const bookings = await Booking.find({ tutor: tutorProfile._id })
      .populate('student', 'name email')

    res.status(200).json({ bookings })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.put('/status/:id', protect, async (req, res) => {
  try {
    const { status } = req.body

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )

    res.status(200).json({ message: 'Booking status updated', booking })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router