const multer = require('multer')
const { isAllowedOrigin, normalizeOrigin } = require('../lib/corsConfig')

// Express 5 forwards rejected promises from async routes here
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Ensure CORS headers are always attached to error responses for allowed origins
  const origin = req.headers?.origin
  if (origin && isAllowedOrigin(origin) && !res.headersSent) {
    const clean = normalizeOrigin(origin)
    res.setHeader('Access-Control-Allow-Origin', clean)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message })
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message })
  }
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0]
    return res.status(400).json({ message: first ? first.message : 'Invalid data' })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` })
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists' })
  }

  console.error(err)
  res.status(500).json({ message: 'Server error' })
}

module.exports = errorHandler
