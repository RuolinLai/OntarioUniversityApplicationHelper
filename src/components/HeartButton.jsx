import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx'
import { setFavorite, useFavorites } from '../hooks/useFavorites.jsx'
import { firebaseConfigured } from '../firebase.js'

// Heart toggle for saving a program. Logged-out users are sent to log in first.
export default function HeartButton({ programId, className = '' }) {
  const { user } = useAuth()
  const { ids } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(false)
  if (!firebaseConfigured) return null

  const on = ids.has(programId)
  const label = error ? 'Couldn’t save — try again' : on ? 'Remove from favourites' : 'Add to favourites'

  async function onClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    setError(false)
    try {
      await setFavorite(user.uid, programId, !on)
    } catch {
      setError(true)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`rounded-full p-1.5 transition hover:bg-brand-50 ${error ? 'ring-2 ring-amber-400' : ''} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 ${on ? 'fill-brand-600 text-brand-600' : 'fill-none text-slate-400 hover:text-brand-600'}`}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinejoin="round" d="M12 20.3l-1.3-1.2C5.6 14.5 2.5 11.7 2.5 8.3 2.5 5.5 4.7 3.3 7.5 3.3c1.6 0 3.1.7 4.5 2 1.4-1.3 2.9-2 4.5-2 2.8 0 5 2.2 5 5 0 3.4-3.1 6.2-8.2 10.8L12 20.3z" />
      </svg>
    </button>
  )
}
