import api from './api'

// Opens (or creates) the conversation with another user and returns its route
export async function conversationPath(userId) {
  const res = await api.post('/messages/conversations', { userId })
  return `/messages/${res.data.conversation._id}`
}
