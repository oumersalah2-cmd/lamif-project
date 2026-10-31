// Usage: node scripts/makeAdmin.js someone@example.com
// Promotes an existing account to admin in the database pointed to by MONGO_URI.
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase()
  if (!email) throw new Error('Pass the email of an existing account')
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set')

  await mongoose.connect(process.env.MONGO_URI)
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { returnDocument: 'after' })
  if (!user) throw new Error(`No account with email ${email}`)
  console.log(`${user.name} is now an admin. They need to log out and back in.`)
}

main()
  .catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
