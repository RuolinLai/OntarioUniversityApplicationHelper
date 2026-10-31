import { Link } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'

// Card-style navigation links ("Back to programs", "Open calendar") so they look clickable,
// instead of bare text links. Links inside a sentence stay as plain text links.

const base =
  'group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-700 hover:shadow'

const arrowCircle = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition'

export function BackButton({ to, state, children, className = '' }) {
  return (
    <Link to={to} state={state} className={`${base} pl-1.5 pr-3.5 ${className}`}>
      <span className={`${arrowCircle} group-hover:-translate-x-0.5`}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </span>
      {children}
    </Link>
  )
}

export function ForwardButton({ to, state, children, className = '' }) {
  return (
    <Link to={to} state={state} className={`${base} pl-3.5 pr-1.5 ${className}`}>
      {children}
      <span className={`${arrowCircle} group-hover:translate-x-0.5`}>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  )
}
