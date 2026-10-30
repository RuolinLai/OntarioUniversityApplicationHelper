import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx'
import { useFavorites } from '../hooks/useFavorites.jsx'
import { useStudent } from '../hooks/useStudent.js'
import { useExtracurriculars } from '../hooks/useUserData.js'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { admissionAverage, formatMark, TOP_N } from '../lib/average.js'
import { countdownLabel, daysBetween, toDateString, upcomingEvents, UPCOMING_DAYS } from '../lib/calendar.js'
import Stat from '../components/Stat.jsx'
import Spinner from '../components/Spinner.jsx'
import UpcomingList from '../components/UpcomingList.jsx'

const shortcuts = [
  { to: '/for-you', title: 'For You', text: 'Safety, match and reach programs' },
  { to: '/programs', title: 'Programs', text: 'Search and filter every program' },
  { to: '/calendar', title: 'Calendar', text: 'Deadlines and your own events' },
  { to: '/profile', title: 'Marks', text: 'Log tests and assignments' },
  { to: '/profile?tab=extracurriculars', title: 'Extracurriculars', text: 'Clubs, sports, jobs and awards' },
  { to: '/profile?tab=favourites', title: 'Favourites', text: 'Programs you’ve saved' },
]

export default function Dashboard() {
  const { user, profile } = useAuth()
  const student = useStudent()
  const favorites = useFavorites()
  const activities = useExtracurriculars()
  const calendar = useCalendarEvents()

  if (student.loading || favorites.loading || activities.loading || calendar.loading) return <Spinner />

  const firstName = (profile?.displayName || user.displayName || '').split(/\s+/)[0]
  const top6 = admissionAverage(null, student.markTable)
  const today = toDateString(new Date())
  const upcoming = upcomingEvents(calendar.events, today)
  // The next deadline can be further away than the 30-day list.
  const next = calendar.events.find((e) => (e.endDate ?? e.date) >= today)
  const nextDays = next ? Math.max(0, daysBetween(today, next.date)) : null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
      <p className="mt-1 text-sm text-slate-600">Here&apos;s where your application stands.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Top 6 average"
          value={formatMark(top6?.average)}
          hint={
            !top6
              ? 'Add marks in your profile'
              : `${top6.courses.length} of ${TOP_N} courses${top6.estimated ? ' · includes Grade 11 estimates' : ''}`
          }
        />
        <Stat label="Favourite programs" value={favorites.items.length} hint={favorites.items.length ? 'Their deadlines are on your calendar' : 'Heart programs to save them'} />
        <Stat label="Extracurriculars" value={activities.items.length} hint="Useful for supplementary applications" />
        <Stat label="Next date" value={next ? countdownLabel(nextDays) : '—'} hint={next ? next.title : 'Nothing on your calendar'} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Next {UPCOMING_DAYS} days</h2>
            <Link to="/calendar" className="text-sm font-medium text-brand-700 hover:underline">
              Open calendar →
            </Link>
          </div>
          <UpcomingList events={upcoming} />
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Shortcuts</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {shortcuts.map((s) => (
              <li key={s.to}>
                <Link to={s.to} className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50">
                  <span className="block text-sm font-medium text-slate-900">{s.title}</span>
                  <span className="block text-xs text-slate-500">{s.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
