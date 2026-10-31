import { useState } from 'react'
import { fileUrl } from '../lib/api'

const initials = name => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')

// Uploaded photo, or the person's initials when there is none (or it fails to load)
function Avatar({ path, name, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (path && !failed) {
    return <img className={`avatar ${className}`} src={fileUrl(path)} alt={name} onError={() => setFailed(true)} />
  }
  return <div className={`avatar avatar-initials ${className}`} aria-label={name}>{initials(name)}</div>
}

export default Avatar
