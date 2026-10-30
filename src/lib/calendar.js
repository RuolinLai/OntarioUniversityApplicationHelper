// Calendar events from three sources (design.md 7.7). Dates are "YYYY-MM-DD" strings and are
// treated as whole days in the student's own time zone.

export const KIND = {
  ouac: { label: 'OUAC dates', color: '#64748b' },
  program: { label: 'Favourite programs', color: '#dc2626' },
  custom: { label: 'My events', color: '#2563eb' },
}

// Colours a student can pick for their own events.
export const CUSTOM_COLORS = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#059669' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Pink', value: '#db2777' },
]

export const UPCOMING_DAYS = 30

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(text) {
  return typeof text === 'string' && DATE_RE.test(text) && !Number.isNaN(parseDate(text).getTime())
}

function parseDate(text) {
  const [y, m, d] = text.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // new Date(2027, 1, 31) quietly becomes March 3, so check it round-trips.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : new Date(NaN)
}

export function toDateString(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(text, days) {
  const date = parseDate(text)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

// Whole days from `from` to `to` (negative if `to` is earlier). Rounded, so daylight saving
// changes don't turn 1 day into 0.96.
export function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86_400_000)
}

// programs: the favourite programs (objects from programs.json). userEvents: [{ id, title, date,
// endDate?, notes?, color? }]. Returns one list sorted by date; entries with bad dates are dropped.
export function buildCalendarEvents({ ouacDates = [], programs = [], userEvents = [] }) {
  const events = []
  for (const d of ouacDates) {
    events.push({ id: `ouac:${d.date}:${d.label}`, kind: 'ouac', title: d.label, date: d.date, color: KIND.ouac.color })
  }
  for (const p of programs) {
    for (const d of p.keyDates ?? []) {
      events.push({
        id: `program:${p.id}:${d.date}:${d.label}`,
        kind: 'program',
        title: `${shortUniversity(p)} ${p.name}: ${d.label}`,
        date: d.date,
        color: KIND.program.color,
        programId: p.id,
      })
    }
  }
  for (const e of userEvents) {
    events.push({
      id: `custom:${e.id}`,
      kind: 'custom',
      title: e.title || 'Untitled event',
      date: e.date,
      // An end date before the start would make the event vanish, so ignore it.
      endDate: isDateString(e.endDate) && e.endDate > e.date ? e.endDate : null,
      notes: e.notes ?? '',
      color: e.color || KIND.custom.color,
      eventId: e.id,
    })
  }
  return events.filter((e) => isDateString(e.date)).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

// "UofT", "Waterloo" … keeps calendar titles short.
function shortUniversity(program) {
  const name = program.university?.shortName ?? program.university?.name ?? ''
  return program.campus ? `${name} ${program.campus}` : name
}

// FullCalendar's all-day end date is exclusive, while ours is the last day of the event.
export function toFullCalendarEvent(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.date,
    end: event.endDate ? addDays(event.endDate, 1) : undefined,
    allDay: true,
    color: event.color,
    extendedProps: { source: event },
  }
}

// Events happening between today and `days` from now, with a countdown. A multi-day event that
// has already started counts until its last day.
export function upcomingEvents(events, today, days = UPCOMING_DAYS) {
  const last = addDays(today, days)
  return events
    .filter((e) => e.date <= last && (e.endDate ?? e.date) >= today)
    .map((e) => ({ ...e, daysLeft: Math.max(0, daysBetween(today, e.date)) }))
}

export function countdownLabel(daysLeft) {
  if (daysLeft === 0) return 'Today'
  if (daysLeft === 1) return 'Tomorrow'
  return `In ${daysLeft} days`
}

// "Jan 15, 2027"
export function formatDate(text) {
  return parseDate(text).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
