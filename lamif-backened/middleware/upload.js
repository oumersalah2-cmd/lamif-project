const multer = require('multer')
const path = require('path')
const fs = require('fs')
const httpError = require('../lib/httpError')

// Ensure uploads directories exist
const publicDir = path.join(__dirname, '..', 'uploads')
const privateDir = path.join(__dirname, '..', 'uploads_private')

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}
if (!fs.existsSync(privateDir)) {
  fs.mkdirSync(privateDir, { recursive: true })
}

// Storage configuration with segregated private document routing
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (['idDocument', 'certificateFiles', 'certificateFile'].includes(file.fieldname)) {
      cb(null, privateDir)
    } else {
      cb(null, publicDir)
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// File filter
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /pdf|doc|docx|jpg|jpeg|png/
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedFileTypes.test(file.mimetype)

  if (extname && mimetype) {
    return cb(null, true)
  } else {
    cb(httpError(400, 'Only .pdf, .doc, .docx, .jpg, .jpeg and .png formats allowed!'))
  }
}

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB limit
  },
  fileFilter: fileFilter
})

upload.publicDir = publicDir
upload.privateDir = privateDir

module.exports = upload
