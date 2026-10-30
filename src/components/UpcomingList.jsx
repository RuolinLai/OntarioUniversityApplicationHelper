import { Link, useLocation } from 'react-router'
import { countdownLabel, formatDate } from '../lib/calendar.js'
import { fromHere } from '../lib/backLink.js'

// Upcoming events with a countdown (calendar sidebar and dashboard). Program deadlines link to the
// program; the student's own events call onSelect, if given.
export default function UpcomingList({ events, onSelect }) {
  const location = useLocation()
  if (events.length === 0) {
    return <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Nothing coming up.</p>
  }
  return (
    <ul className="mt-3 space-y-2">
      {events.map((e) => {
        const body = (
          <>
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">{e.title}</span>
              <span className="block text-xs text-slate-500">
                {formatDate(e.date)}
                {e.endDate && ` – ${formatDate(e.endDate)}`}
              </span>
            </span>
            <span className={`shrink-0 text-xs font-semibold ${e.daysLeft <= 7 ? 'text-brand-700' : 'text-slate-500'}`}>{countdownLabel(e.daysLeft)}</span>
          </>
        )
        const className = 'flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50'
        return (
          <li key={e.id}>
            {e.kind === 'program' ? (
              <Link to={`/programs/${e.programId}`} state={fromHere(location)} className={className}>
                {body}
              </Link>
            ) : e.kind === 'custom' && onSelect ? (
              <button type="button" className={className} onClick={() => onSelect(e)}>
                {body}
              </button>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
