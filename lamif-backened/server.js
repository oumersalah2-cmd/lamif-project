const mongoose = require('mongoose')
require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT || 5000

async function connectDatabase() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB!')
    return
  }

  // No MONGO_URI: local development against a throwaway in-memory database with demo data
  const { MongoMemoryServer } = require('mongodb-memory-server')
  // First start on a cold machine can take a while
  const memoryServer = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
  await mongoose.connect(memoryServer.getUri())
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'lamif-dev-secret'
  console.log('Connected to in-memory MongoDB (data resets on restart)')
  await require('./seed')()
}

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.log('MongoDB error:', err)
    process.exit(1)
  })
