const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure uploads directory exists
const dir = 'uploads/'
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
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
    cb(new Error('Only .pdf, .doc, .docx, .jpg, .jpeg and .png formats allowed!'))
  }
}

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  },
  fileFilter: fileFilter
})

module.exports = upload
