const jwt = require('jsonwebtoken')

// Like `protect`, but lets anonymous visitors through with req.user unset
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      // An expired token on a public page just means "browse as a guest"
    }
  }
  next()
}

module.exports = optionalAuth
