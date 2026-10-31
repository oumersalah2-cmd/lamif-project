import { useCallback, useEffect, useState } from 'react'
import api from './api'
import { getUser } from './session'

// Saved ("hearted") tutors for the logged-in user; anonymous visitors get an empty set
export default function useSavedTutors() {
  const [savedIds, setSavedIds] = useState(() => new Set())

  useEffect(() => {
    if (!getUser()) return
    api.get('/saved')
      .then(res => setSavedIds(new Set(res.data.ids)))
      .catch(() => {})
  }, [])

  const toggleSaved = useCallback(async tutorId => {
    const isSaved = savedIds.has(tutorId)
    setSavedIds(prev => {
      const next = new Set(prev)
      if (isSaved) next.delete(tutorId)
      else next.add(tutorId)
      return next
    })
    try {
      if (isSaved) await api.delete(`/saved/${tutorId}`)
      else await api.post(`/saved/${tutorId}`)
    } catch {
      setSavedIds(prev => {
        const reverted = new Set(prev)
        if (isSaved) reverted.add(tutorId)
        else reverted.delete(tutorId)
        return reverted
      })
    }
  }, [savedIds])

  return { savedIds, toggleSaved, canSave: Boolean(getUser()) }
}
