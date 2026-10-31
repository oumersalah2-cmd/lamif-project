export function StarRating({ value, count }) {
  if (value == null) return <span className="muted small">No reviews yet</span>
  const rounded = Math.round(value)
  return (
    <span className="row" style={{ gap: '6px' }}>
      <span className="stars" aria-label={`${value} out of 5`}>{'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}</span>
      <strong>{value.toFixed(1)}</strong>
      {count != null && <span className="muted small">({count})</span>}
    </span>
  )
}

export function StarInput({ value, onChange }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
      ))}
    </div>
  )
}
