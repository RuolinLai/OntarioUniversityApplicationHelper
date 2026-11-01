import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import listPlugin from '@fullcalendar/react/list'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Flag, GraduationCap, Hourglass, LayoutGrid, List, Plus, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useFavorites } from '../hooks/useFavorites.jsx'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { deleteUserItem, saveUserItem } from '../hooks/useUserData.js'
import { useSaver } from '../hooks/useSaver.js'
import {
  countdownLabel,
  daysBetween,
  CUSTOM_COLORS,
  formatDate,
  isDateString,
  KIND,
  toDateString,
  toFullCalendarEvent,
  upcomingEvents,
  UPCOMING_DAYS,
} from '../lib/calendar.js'
import Modal from '../components/Modal.jsx'
import { fromHere } from '../lib/backLink.js'
import UpcomingList from '../components/UpcomingList.jsx'
import Spinner from '../components/Spinner.jsx'
import { inputClass, primaryButton, secondaryButton } from '../components/form.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

// A month grid is too cramped on a phone, so small screens start with a list of the month's events.
const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches

const KIND_ICON = { ouac: Flag, program: GraduationCap, custom: Star }

// Our own look for an event: an icon for its kind plus the title. In the month grid it sits on
// the event's colour (white text); in the list view the theme draws a coloured dot, so dark text.
function EventContent({ event, view }) {
  const source = event.extendedProps.source
  const Icon = KIND_ICON[source.kind] ?? Star
  const inList = view.type.startsWith('list')
  return (
    <span className={`flex min-w-0 items-center gap-1 ${inList ? 'text-slate-800' : 'px-0.5 text-white'}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate text-xs font-medium">{event.title}</span>
    </span>
  )
}

// Day number in the top corner of each cell: a filled circle for today, faded for past days.
function DayNumber({ dayNumberText, isToday, isPast, isOther }) {
  if (isToday) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
        {dayNumberText}
      </span>
    )
  }
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center text-sm ${isOther ? 'text-slate-300' : isPast ? 'text-slate-400' : 'font-medium text-slate-700'}`}
    >
      {dayNumberText}
    </span>
  )
}

const toolbarButton =
  'flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50'

export default function Calendar() {
  usePageTitle('Calendar')
  const { events, loading } = useCalendarEvents()
  const favorites = useFavorites()
  const calendarRef = useRef(null)
  // Title and view come from FullCalendar (datesSet) so our own toolbar can show them.
  const [view, setView] = useState({ title: '', type: isSmallScreen() ? 'listMonth' : 'dayGridMonth' })
  // null = closed, { date } = new event, { event } = editing one of the student's events,
  // { info } = a read-only OUAC date.
  const [dialog, setDialog] = useState(null)
  const calendarEvents = useMemo(() => events.map(toFullCalendarEvent), [events])

  if (loading) return <Spinner />

  const today = toDateString(new Date())
  const upcoming = upcomingEvents(events, today)
  const programDates = events.filter((e) => e.kind === 'program').length
  const next = upcoming[0]
  const api = () => calendarRef.current?.getApi()

  function onEventClick({ event, jsEvent }) {
    jsEvent.preventDefault()
    const source = event.extendedProps.source
    openEvent(source)
  }

  function openEvent(source) {
    if (source.kind === 'custom') setDialog({ event: source })
    else if (source.kind === 'program') setDialog({ deadline: source })
    else setDialog({ info: source })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
            <p className="mt-1 text-sm text-slate-600">Click a day to add an event · click a deadline to see what it&apos;s for</p>
          </div>
        </div>
        <button type="button" className={`${primaryButton} flex items-center gap-1.5`} onClick={() => setDialog({ date: today })}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add event
        </button>
      </div>

      {/* Legend as cards: what each colour means and how many of each there are. */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {Object.entries(KIND).map(([key, k]) => {
          const Icon = KIND_ICON[key]
          const count = events.filter((e) => e.kind === key).length
          return (
            <div key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: k.color }}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight text-slate-900">{count}</span>
                <span className="block truncate text-xs text-slate-500">{k.label}</span>
              </span>
            </div>
          )
        })}
      </div>

      {favorites.items.length > 0 && programDates === 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          None of your interested programs list specific deadlines on their websites yet. Check each program&apos;s official page for
          supplementary application dates.
        </p>
      )}
      {favorites.items.length === 0 && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Heart programs in{' '}
          <Link to="/programs" className="font-medium text-brand-700 hover:underline">
            Programs
          </Link>{' '}
          and their deadlines will show up here.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="calendar overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-xl font-bold text-slate-900">{view.title}</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="View">
                {[
                  ['dayGridMonth', 'Month', LayoutGrid],
                  ['listMonth', 'List', List],
                ].map(([type, label, Icon]) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={view.type === type}
                    onClick={() => api()?.changeView(type)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ${
                      view.type === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <button type="button" className={`${toolbarButton} px-3`} onClick={() => api()?.today()}>
                Today
              </button>
              <button type="button" className={`${toolbarButton} w-9`} onClick={() => api()?.prev()} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={`${toolbarButton} w-9`} onClick={() => api()?.next()} aria-label="Next month">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="p-2 sm:p-3">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, listPlugin, interactionPlugin, classicThemePlugin]}
              initialView={view.type}
              headerToolbar={false}
              footerToolbar={false}
              noEventsText="No events this month"
              height="auto"
              dayMaxEvents={3}
              events={calendarEvents}
              datesSet={({ view: v }) => setView({ title: v.title, type: v.type })}
              dayHeaderContent={({ text }) => <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text}</span>}
              dayCellTopContent={(arg) => <DayNumber {...arg} />}
              dayCellClass={({ dow, isOther }) => (isOther ? 'bg-slate-50/60' : dow === 0 || dow === 6 ? 'bg-brand-50/30' : '')}
              eventContent={(arg) => <EventContent {...arg} />}
              rowEventClass="!rounded-md !border-0 shadow-sm"
              dateClick={({ dateStr }) => setDialog({ date: dateStr })}
              eventClick={onEventClick}
            />
          </div>
        </div>

        <aside>
          {next && (
            <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 p-5 text-white shadow-sm">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:18px_18px]" />
              <div className="relative">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
                  <Hourglass className="h-3.5 w-3.5" aria-hidden="true" /> Coming up next
                </p>
                <p className="mt-2 text-3xl font-bold">{countdownLabel(next.daysLeft)}</p>
                <p className="mt-1 text-sm text-white/90">{next.title}</p>
                <p className="mt-0.5 text-xs text-white/60">{formatDate(next.date)}</p>
              </div>
            </div>
          )}
          <h2 className="font-semibold text-slate-900">Next {UPCOMING_DAYS} days</h2>
          <UpcomingList events={upcoming} onSelect={openEvent} />
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
      {dialog?.deadline && <DeadlineDialog event={dialog.deadline} today={today} onClose={() => setDialog(null)} />}
      {(dialog?.date || dialog?.event) && (
        <EventDialog key={dialog.event?.id ?? dialog.date} initial={dialog} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}

// A program deadline: what it is, when, and what the program asks for, with links to the
// program page and the official site.
function DeadlineDialog({ event, today, onClose }) {
  const location = useLocation()
  const { program, label, date } = event
  const days = daysBetween(today, date)
  const items = program.special?.items ?? []
  return (
    <Modal title={label} onClose={onClose}>
      <p className="text-sm font-medium text-brand-700">
        {program.university?.shortName ?? program.university?.name}
        {program.campus && ` · ${program.campus}`}
      </p>
      <p className="font-semibold text-slate-900">{program.name}</p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-sm font-semibold text-slate-900">{formatDate(date)}</span>
        <span className={`text-xs font-semibold ${days < 0 ? 'text-slate-400' : days <= 7 ? 'text-red-600' : 'text-slate-500'}`}>
          {days < 0 ? 'Passed' : countdownLabel(days)}
        </span>
      </div>
      {program.supplementary?.required && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What this program asks for</p>
          {items.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {items.map((item) => (
                <li key={item.label} className="text-sm">
                  <span className="font-medium text-slate-900">{item.label}</span>
                  {item.detail && <span className="block text-slate-600">{item.detail}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-700">{program.supplementary.type}</p>
          )}
          {program.special?.notes.map((n) => (
            <p key={n} className="mt-2 text-sm text-slate-600">
              {n}
            </p>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={`/programs/${program.id}`} state={fromHere(location)} className={primaryButton}>
          Open program page
        </Link>
        <a href={program.officialUrl} target="_blank" rel="noreferrer" className={`${secondaryButton} inline-flex items-center gap-1.5`}>
          Official website <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </Modal>
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
          <input
            className={`${inputClass} mt-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Waterloo info session"
            autoFocus
          />
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

        {(problem || error) && <p className="text-sm text-red-700">{problem || error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className={primaryButton} disabled={saving}>
            {existing ? 'Save' : 'Add event'}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          {existing && (
            <button
              type="button"
              className="ml-auto text-sm font-medium text-brand-700 hover:underline"
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
