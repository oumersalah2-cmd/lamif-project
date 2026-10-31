import { useId } from 'react'
import { Link } from 'react-router-dom'

// The LAMIF globe: a sphere of latitude "circuit" lines with particles breaking away, after the brand artwork
export function LogoMark({ size = 32, className = '' }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="18" cy="22" r="15" />
        </clipPath>
      </defs>
      <circle cx="18" cy="22" r="15" fill={`url(#${id}-fill)`} />
      <g clipPath={`url(#${id}-clip)`} stroke="#ecfdf5" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M2 14.5h17M2 19h23M4 23.5h27M3 28h24M6 32.5h16" />
        <ellipse cx="18" cy="22" rx="6.5" ry="15" opacity="0.55" />
      </g>
      <g fill="#ecfdf5">
        <circle cx="19" cy="14.5" r="1.5" />
        <circle cx="25" cy="19" r="1.5" />
        <circle cx="31" cy="23.5" r="1.5" />
        <circle cx="27" cy="28" r="1.5" />
      </g>
      <g fill="#34d399">
        <rect x="27" y="7" width="3.6" height="3.6" rx="1" transform="rotate(20 28.8 8.8)" />
        <rect x="32.5" y="11.5" width="3" height="3" rx="0.9" transform="rotate(35 34 13)" opacity="0.85" />
        <rect x="33" y="4" width="2.6" height="2.6" rx="0.8" transform="rotate(10 34.3 5.3)" opacity="0.65" />
        <rect x="22" y="3.5" width="2.4" height="2.4" rx="0.7" opacity="0.5" />
      </g>
    </svg>
  )
}

function Logo({ to = '/', size = 32 }) {
  return (
    <Link to={to} className="logo" aria-label="LAMIF home">
      <LogoMark size={size} />
      <span className="logo-word">LAMIF</span>
    </Link>
  )
}

export default Logo
