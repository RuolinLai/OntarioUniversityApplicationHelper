import { Link } from 'react-router'
import { ArrowRight, CalendarClock, CalendarDays, ClipboardList, GraduationCap, Heart, Sparkles, Trophy } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useFavorites } from '../hooks/useFavorites.jsx'
import { useStudent } from '../hooks/useStudent.js'
import { useExtracurriculars } from '../hooks/useUserData.js'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { formatMark, TOP_N } from '../lib/average.js'
import { countdownLabel, daysBetween, toDateString, upcomingEvents, UPCOMING_DAYS } from '../lib/calendar.js'
import { courseName } from '../lib/data.js'
import Stat from '../components/Stat.jsx'
import Spinner from '../components/Spinner.jsx'
import UpcomingList from '../components/UpcomingList.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { ForwardButton } from '../components/LinkButton.jsx'
// The Top 6 card keeps its own blue bars (the user liked this card as it is).
import { ESTIMATED_MARK_COLOR, MARK_COLOR } from '../components/charts/MarkBar.jsx'

const shortcuts = [
  { to: '/for-you', title: 'For You', text: 'Safety, match & reach', icon: Sparkles, tone: 'bg-brand-50 text-brand-700' },
  { to: '/programs', title: 'Programs', text: 'Search every program', icon: GraduationCap, tone: 'bg-sky-50 text-sky-700' },
  { to: '/calendar', title: 'Calendar', text: 'Deadlines & events', icon: CalendarDays, tone: 'bg-violet-50 text-violet-700' },
  { to: '/profile', title: 'Marks', text: 'Tests & assignments', icon: ClipboardList, tone: 'bg-emerald-50 text-emerald-700' },
  {
    to: '/profile?tab=extracurriculars',
    title: 'Activities',
    text: 'Clubs, jobs, awards',
    icon: Trophy,
    tone: 'bg-amber-50 text-amber-700',
  },
  { to: '/profile?tab=interested', title: 'Interested', text: 'Programs you like', icon: Heart, tone: 'bg-rose-50 text-rose-700' },
]


// The six courses behind the average, as bars on a 0–100% scale (values printed at the tip).
// Marks estimated from Grade 11 use a lighter blue and say "est." in words.
function Top6Chart({ courses }) {
  return (
    <ul className="mt-5 space-y-2.5" aria-label="Marks in your top 6 courses">
      {courses.map((c) => (
        <li
          key={c.code}
          className="grid grid-cols-[4.5rem_1fr] items-center gap-3"
          title={`${c.code} ${courseName(c.code)}: ${formatMark(c.mark)}`}
        >
          <span className="font-mono text-xs font-semibold text-slate-700">{c.code}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 rounded-r-[4px]"
              style={{ width: `${c.mark * 0.8}%`, background: c.estimated ? ESTIMATED_MARK_COLOR : MARK_COLOR }}
            />
            <span className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-700">
              {Math.round(c.mark)}%{c.estimated && <span className="font-normal text-slate-500"> est.</span>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const { user, profile } = useAuth()
  const student = useStudent()
  const favorites = useFavorites()
  const activities = useExtracurriculars()
  const calendar = useCalendarEvents()

  if (student.loading || favorites.loading || activities.loading || calendar.loading) return <Spinner />

  const firstName = (profile?.displayName || user.displayName || '').split(/\s+/)[0]
  const top6 = student.topSix
  const today = toDateString(new Date())
  const upcoming = upcomingEvents(calendar.events, today)
  // The next deadline can be further away than the 30-day list.
  const next = calendar.events.find((e) => (e.endDate ?? e.date) >= today)
  const nextDays = next ? Math.max(0, daysBetween(today, next.date)) : null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
      <p className="mt-1 text-sm text-slate-600">Here&apos;s where your application stands.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
          <div className="relative">
            <p className="text-sm text-slate-300">Top 6 average</p>
            <p className="mt-1 text-5xl font-bold">{formatMark(top6?.average)}</p>
            <p className="mt-2 text-sm text-slate-300">
              {!top6
                ? 'Add marks in your profile'
                : `${top6.courses.length} of ${TOP_N} courses${top6.estimated ? ' · includes Grade 11 estimates' : ''}`}
            </p>
            {top6 ? (
              <div className="mt-2 rounded-2xl bg-white p-4 text-slate-900">
                <Top6Chart courses={top6.courses} />
              </div>
            ) : (
              <Link
                to="/profile"
                className="mt-5 inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
              >
                Add marks <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Stat
            icon={Heart}
            tone="bg-rose-50 text-rose-600"
            label="Interested programs"
            value={favorites.items.length}
            hint={favorites.items.length ? 'Their deadlines are on your calendar' : 'Heart programs to save them'}
          />
          <Stat
            icon={Trophy}
            tone="bg-amber-50 text-amber-600"
            label="Extracurriculars"
            value={activities.items.length}
            hint="Useful for supplementary applications"
          />
          <div className="sm:col-span-2">
            <Stat
              icon={CalendarClock}
              tone="bg-violet-50 text-violet-600"
              label="Next date"
              value={next ? countdownLabel(nextDays) : '—'}
              hint={next ? next.title : 'Nothing on your calendar'}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Next {UPCOMING_DAYS} days</h2>
            <ForwardButton to="/calendar">Open calendar</ForwardButton>
          </div>
          <UpcomingList events={upcoming} />
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Shortcuts</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {shortcuts.map(({ to, title, text, icon: Icon, tone }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="block h-full rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm font-medium text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
