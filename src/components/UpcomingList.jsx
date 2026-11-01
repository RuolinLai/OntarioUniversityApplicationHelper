import { Link, useLocation } from 'react-router'
import { CalendarCheck } from 'lucide-react'
import { countdownLabel, formatDate } from '../lib/calendar.js'
import { fromHere } from '../lib/backLink.js'

// Upcoming events with a countdown (calendar sidebar and dashboard). Program deadlines link to the
// program unless onSelect is given, which then handles every event (the calendar opens a dialog).
export default function UpcomingList({ events, onSelect }) {
  const location = useLocation()
  if (events.length === 0) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        <CalendarCheck className="h-6 w-6 text-slate-300" aria-hidden="true" />
        Nothing coming up.
      </div>
    )
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
            <span className={`shrink-0 text-xs font-semibold ${e.daysLeft <= 7 ? 'text-red-600' : 'text-slate-500'}`}>{countdownLabel(e.daysLeft)}</span>
          </>
        )
        const className = 'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-slate-50'
        return (
          <li key={e.id}>
            {onSelect ? (
              <button type="button" className={className} onClick={() => onSelect(e)}>
                {body}
              </button>
            ) : e.kind === 'program' ? (
              <Link to={`/programs/${e.programId}`} state={fromHere(location)} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
