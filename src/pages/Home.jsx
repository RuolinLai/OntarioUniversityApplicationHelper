import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { ArrowRight, CalendarDays, ClipboardList, GraduationCap, Lightbulb, ListChecks, Search, Target } from 'lucide-react'
import { allPrograms, allUniversities } from '../lib/data.js'
import tips from '../data/tips.json'
import { useAuth } from '../hooks/useAuth.jsx'
import Dashboard from './Dashboard.jsx'
import Spinner from '../components/Spinner.jsx'
import RangeBar, { RANGE_COLOR, YOU_COLOR } from '../components/charts/RangeBar.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { ForwardButton } from '../components/LinkButton.jsx'

const features = [
  { icon: ListChecks, title: 'Check prerequisites', text: 'See which programs your courses qualify for.' },
  { icon: Target, title: 'Safety, match & reach', text: 'Compare your average with past admission ranges.' },
  { icon: ClipboardList, title: 'Track your marks', text: 'Course and top-6 averages, calculated for you.' },
  { icon: CalendarDays, title: 'Never miss a deadline', text: 'Programs you’re interested in put their dates on your calendar.' },
]

const popularSearches = ['Engineering', 'Computer Science', 'Health Sciences', 'Business', 'Nursing']

// Programs per university, largest first, for the "Universities covered" chart.
const programCounts = allPrograms.reduce((counts, p) => counts.set(p.universityId, (counts.get(p.universityId) ?? 0) + 1), new Map())
const coverage = allUniversities.map((u) => ({ ...u, count: programCounts.get(u.id) ?? 0 })).sort((a, b) => b.count - a.count)
const maxCount = Math.max(...coverage.map((u) => u.count))

// Signed-in students who finished onboarding get their dashboard; everyone else the landing page.
export default function Home() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (user && profile?.onboardingDone) return <Dashboard />
  return <Landing needsOnboarding={Boolean(user)} />
}

// A sample program card in the hero, showing what the site does at a glance.
function HeroExample() {
  return (
    <div className="relative hidden lg:block" aria-hidden="true">
      <div className="absolute -right-4 -top-4 h-full w-full rotate-3 rounded-2xl bg-white/10" />
      <div className="relative rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Example</span>
          <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-semibold text-white">Match</span>
        </div>
        <p className="mt-3 text-sm text-slate-500">University of Somewhere</p>
        <p className="text-lg font-semibold">Computer Science</p>
        <div className="mt-2">
          <RangeBar range={{ low: 84, high: 89 }} you={88.5} domain={[70, 100]} size="md" />
        </div>
        <div className="flex gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full" style={{ background: RANGE_COLOR }} /> Admission range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: YOU_COLOR }} /> Your average
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
          {['ENG4U', 'MHF4U', 'MCV4U'].map((c) => (
            <span key={c} className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-xs font-semibold text-emerald-700">
              ✓ {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Landing({ needsOnboarding }) {
  usePageTitle('')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function onSubmit(e) {
    e.preventDefault()
    navigate(query.trim() ? `/programs?q=${encodeURIComponent(query.trim())}` : '/programs')
  }

  const stats = [
    { value: allPrograms.length, label: 'programs' },
    { value: allUniversities.length, label: 'universities' },
    { value: tips.length, label: 'application tips' },
  ]

  return (
    <div>
      {needsOnboarding && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You&apos;re almost set up.{' '}
          <Link to="/onboarding" className="font-medium underline">
            Add your courses
          </Link>{' '}
          to see your dashboard.
        </p>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-800 px-5 py-10 text-white sm:px-10 sm:py-14">
        {/* Decorative dot grid and soft circles */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.16)_1px,transparent_0)] bg-[size:22px_22px]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-black/10 blur-2xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_22rem]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <GraduationCap className="h-4 w-4" aria-hidden="true" /> For Ontario Grade 12 students
            </span>
            <h1 className="mt-4 max-w-xl text-3xl font-bold leading-tight sm:text-5xl">Your personal uni-application helper</h1>
            <form onSubmit={onSubmit} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Try "Engineering" or "Waterloo"'
                  aria-label="Search programs"
                  className="w-full rounded-xl bg-white py-3.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-white/30"
                />
              </div>
              <button type="submit" className="rounded-xl bg-slate-900 px-6 py-3.5 font-medium hover:bg-slate-800">
                Search
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-brand-100">Popular:</span>
              {popularSearches.map((q) => (
                <Link
                  key={q}
                  to={`/programs?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-white/30 px-3 py-1 text-white/90 hover:bg-white/15"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
          <HeroExample />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white py-5 shadow-sm">
        {stats.map((s) => (
          <div key={s.label} className="px-2 text-center">
            <div className="text-2xl font-bold text-slate-900 sm:text-3xl">{s.value}</div>
            <div className="text-xs text-slate-500 sm:text-sm">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
      <ForwardButton to="/guide" className="mt-4">
        How to use this site
      </ForwardButton>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Universities covered</h2>
            <p className="text-sm text-slate-500">Programs per university · updated weekly from official websites</p>
          </div>
          <ForwardButton to="/programs">Browse all</ForwardButton>
        </div>
        <ul className="mt-5 space-y-1">
          {coverage.map((u) => (
            <li key={u.id}>
              <Link
                to={`/programs?uni=${u.id}`}
                className="grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 sm:grid-cols-[14rem_1fr]"
                title={`${u.name}: ${u.count} programs`}
              >
                <span className="truncate text-sm text-slate-700">
                  <span className="sm:hidden">{u.shortName}</span>
                  <span className="hidden sm:inline">{u.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 rounded-r-[4px]"
                    style={{ width: `${Math.max(2, (u.count / maxCount) * 85)}%`, background: RANGE_COLOR }}
                  />
                  <span className="text-xs font-medium tabular-nums text-slate-600">{u.count}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-mint/40 p-6 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700">
          <Lightbulb className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">Not sure where to start?</h2>
          <p className="mt-0.5 text-sm text-slate-600">Quick tips on interviews, supplementary applications and offers.</p>
        </div>
        <Link
          to="/tips"
          className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Read the tips <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}
