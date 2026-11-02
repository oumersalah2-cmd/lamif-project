const User = require('../models/User')

const requireVerified = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  // Look up user in database to ensure verification status is fresh
  const user = await User.findById(req.user.id).select('emailVerified')
  if (!user || !user.emailVerified) {
    return res.status(403).json({
      message: 'Please verify your email address to continue',
      code: 'EMAIL_NOT_VERIFIED'
    })
  }

  next()
}

module.exports = requireVerified
