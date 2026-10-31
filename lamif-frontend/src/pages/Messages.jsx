import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import api, { errorMessage } from '../lib/api'
import { getUser } from '../lib/session'
import { formatTime, timeAgo } from '../lib/format'

const POLL_MS = 5000

function Messages() {
  const { conversationId } = useParams()
  const user = getUser()
  const [conversations, setConversations] = useState([])
  const [thread, setThread] = useState(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const loadList = () => api.get('/messages/conversations').then(res => setConversations(res.data.conversations)).catch(() => {})
    loadList()
    const timer = setInterval(loadList, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    const loadThread = () => api.get(`/messages/conversations/${conversationId}`)
      .then(res => { if (!cancelled) setThread(res.data) })
      .catch(err => { if (!cancelled) setError(errorMessage(err)) })
    loadThread()
    const timer = setInterval(loadThread, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [conversationId])

  const messageCount = thread?.messages.length
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageCount])

  const send = async e => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBody('')
    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, { body: text })
      setThread(prev => ({ ...prev, messages: [...prev.messages, res.data.message] }))
    } catch (err) {
      setBody(text)
      setError(errorMessage(err))
    }
  }

  const activeThread = conversationId && thread?.conversation._id === conversationId ? thread : null

  return (
    <div className="page">
      <div className="page-header"><h1>Messages</h1></div>
      <div className={`messages-layout glass-card ${conversationId ? 'has-thread' : ''}`}>
        <div className="conversation-list">
          {conversations.length === 0 && <p className="empty small">No conversations yet. Message a tutor from their profile.</p>}
          {conversations.map(c => (
            <Link key={c._id} to={`/messages/${c._id}`} className={`conversation-item ${c._id === conversationId ? 'active' : ''}`}>
              <div className="row-between">
                <strong>{c.other?.name}</strong>
                {c.unread > 0 && <span className="nav-count">{c.unread}</span>}
              </div>
              <div className="muted small clamp-2" style={{ margin: '2px 0' }}>{c.lastMessage || 'No messages yet'}</div>
              <div className="muted small">{timeAgo(c.lastMessageAt)}</div>
            </Link>
          ))}
        </div>

        <div className="thread">
          {!conversationId ? (
            <div className="empty" style={{ margin: 'auto' }}>Select a conversation</div>
          ) : !activeThread ? (
            <div className="empty" style={{ margin: 'auto' }}>{error || 'Loading...'}</div>
          ) : (
            <>
              <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                <Link to="/messages" className="icon-btn nav-burger" aria-label="Back to conversations"><Icon name="arrowRight" size={18} style={{ transform: 'rotate(180deg)' }} /></Link>
                <strong>{activeThread.conversation.other?.name}</strong>
                <span className="muted small">{activeThread.conversation.other?.role}</span>
              </div>
              <div className="thread-messages">
                {activeThread.messages.length === 0 && <p className="muted small" style={{ textAlign: 'center' }}>Say hello 👋</p>}
                {activeThread.messages.map(m => (
                  <div key={m._id} className={`bubble ${String(m.sender) === String(user.id) ? 'mine' : ''}`}>
                    {m.body}
                    <time>{formatTime(m.createdAt)}</time>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form className="thread-compose" onSubmit={send}>
                <input className="input" placeholder="Write a message..." value={body} onChange={e => setBody(e.target.value)} maxLength={5000} />
                <button className="btn-primary btn-sm" disabled={!body.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages
