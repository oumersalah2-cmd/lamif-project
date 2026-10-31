const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Tutor = require('../models/Tutor')
const protect = require('../middleware/authMiddleware')
const httpError = require('../lib/httpError')
const { withTutorStats } = require('../lib/tutorStats')

router.use(protect)

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.id).populate({ path: 'savedTutors', populate: { path: 'user', select: 'name' } })
  const tutors = (user?.savedTutors || []).filter(Boolean)
  res.json({ tutors: await withTutorStats(tutors), ids: tutors.map(t => t._id) })
})

router.post('/:tutorId', async (req, res) => {
  if (!(await Tutor.exists({ _id: req.params.tutorId }))) throw httpError(404, 'Tutor not found')
  await User.updateOne({ _id: req.user.id }, { $addToSet: { savedTutors: req.params.tutorId } })
  res.json({ message: 'Tutor saved' })
})

router.delete('/:tutorId', async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $pull: { savedTutors: req.params.tutorId } })
  res.json({ message: 'Tutor removed from saved' })
})

module.exports = router
