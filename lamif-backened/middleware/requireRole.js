// Use after `protect`: requireRole('tutor') or requireRole('student', 'admin')
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have access to this action' })
  }
  next()
}

module.exports = requireRole
