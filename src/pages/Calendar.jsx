import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import { useAuth } from '../hooks/useAuth.jsx'
import { useFavorites } from '../hooks/useFavorites.jsx'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { deleteUserItem, saveUserItem } from '../hooks/useUserData.js'
import { useSaver } from '../hooks/useSaver.js'
import { CUSTOM_COLORS, formatDate, isDateString, KIND, toDateString, toFullCalendarEvent, upcomingEvents, UPCOMING_DAYS } from '../lib/calendar.js'
import Modal from '../components/Modal.jsx'
import { fromHere } from '../lib/backLink.js'
import UpcomingList from '../components/UpcomingList.jsx'
import Spinner from '../components/Spinner.jsx'
import { inputClass, primaryButton, secondaryButton } from '../components/form.js'

export default function Calendar() {
  const { events, loading } = useCalendarEvents()
  const favorites = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  // null = closed, { date } = new event, { event } = editing one of the student's events,
  // { info } = a read-only OUAC date.
  const [dialog, setDialog] = useState(null)

  if (loading) return <Spinner />

  const today = toDateString(new Date())
  const upcoming = upcomingEvents(events, today)
  const programDates = events.filter((e) => e.kind === 'program').length

  function onEventClick({ event, jsEvent }) {
    jsEvent.preventDefault()
    const source = event.extendedProps.source
    if (source.kind === 'custom') setDialog({ event: source })
    else if (source.kind === 'program') navigate(`/programs/${source.programId}`, { state: fromHere(location) })
    else setDialog({ info: source })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-600">Click a day to add your own event. Click a program deadline to open the program.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setDialog({ date: today })}>
          + Add event
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
        {Object.entries(KIND).map(([key, k]) => (
          <span key={key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: k.color }} aria-hidden="true" />
            {k.label}
          </span>
        ))}
      </div>

      {favorites.items.length > 0 && programDates === 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          None of your favourite programs list specific deadlines on their websites yet. Check each program&apos;s official page for
          supplementary application dates.
        </p>
      )}
      {favorites.items.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Heart programs in{' '}
          <Link to="/programs" className="font-medium text-brand-700 hover:underline">
            Programs
          </Link>{' '}
          and their deadlines will show up here.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="calendar rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, classicThemePlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ start: 'title', end: 'today prev,next' }}
            height="auto"
            dayMaxEvents={3}
            events={events.map(toFullCalendarEvent)}
            dateClick={({ dateStr }) => setDialog({ date: dateStr })}
            eventClick={onEventClick}
          />
        </div>

        <aside>
          <h2 className="font-semibold text-slate-900">Next {UPCOMING_DAYS} days</h2>
          <UpcomingList events={upcoming} onSelect={(e) => (e.kind === 'custom' ? setDialog({ event: e }) : null)} />
        </aside>
      </div>

      {dialog?.info && (
        <Modal title={dialog.info.title} onClose={() => setDialog(null)}>
          <p className="text-sm text-slate-700">{formatDate(dialog.info.date)}</p>
          <p className="mt-3 text-sm text-slate-500">
            A date that applies to every Ontario university applicant. Confirm it on the{' '}
            <a href="https://www.ouac.on.ca/" target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
              OUAC website
            </a>
            .
          </p>
        </Modal>
      )}
      {(dialog?.date || dialog?.event) && <EventDialog key={dialog.event?.id ?? dialog.date} initial={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

function EventDialog({ initial, onClose }) {
  const { user } = useAuth()
  const existing = initial.event
  const [title, setTitle] = useState(existing?.title ?? '')
  const [date, setDate] = useState(existing?.date ?? initial.date)
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [color, setColor] = useState(existing?.color ?? CUSTOM_COLORS[0].value)
  const [problem, setProblem] = useState('')
  const { saving, error, run } = useSaver()

  async function onSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return setProblem('Give the event a name.')
    if (!isDateString(date)) return setProblem('Pick a date.')
    if (endDate && endDate < date) return setProblem('The end date can’t be before the start date.')
    setProblem('')
    const data = { title: title.trim(), date, endDate: endDate && endDate !== date ? endDate : null, notes: notes.trim(), color }
    if (await run(() => saveUserItem(user.uid, 'events', existing?.eventId, data))) onClose()
  }

  async function onDelete() {
    if (!window.confirm(`Delete “${existing.title}”?`)) return
    if (await run(() => deleteUserItem(user.uid, 'events', existing.eventId))) onClose()
  }

  return (
    <Modal title={existing ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input className={`${inputClass} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Waterloo info session" autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Date
            <input type="date" className={`${inputClass} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ends <span className="font-normal text-slate-400">(optional)</span>
            <input type="date" className={`${inputClass} mt-1`} value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Notes <span className="font-normal text-slate-400">(optional)</span>
          <textarea className={`${inputClass} mt-1`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Colour</legend>
          <div className="mt-1 flex gap-2">
            {CUSTOM_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                aria-pressed={color === c.value}
                className={`h-7 w-7 rounded-full ring-offset-2 ${color === c.value ? 'ring-2 ring-slate-900' : ''}`}
                style={{ background: c.value }}
              />
            ))}
          </div>
        </fieldset>

        {(problem || error) && <p className="text-sm text-brand-700">{problem || error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className={primaryButton} disabled={saving}>
            {existing ? 'Save' : 'Add event'}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          {existing && (
            <button type="button" className="ml-auto text-sm font-medium text-brand-700 hover:underline" onClick={onDelete} disabled={saving}>
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
