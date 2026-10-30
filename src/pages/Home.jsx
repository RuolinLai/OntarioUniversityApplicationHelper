import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { allPrograms, allUniversities } from '../lib/data.js'
import { useAuth } from '../hooks/useAuth.jsx'
import Dashboard from './Dashboard.jsx'
import Spinner from '../components/Spinner.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'

const features = [
  { title: 'Find programs you qualify for', text: 'Enter your Grade 12 courses and see which programs match their prerequisites.' },
  { title: 'Safety, match & reach', text: 'Compare your average with published admission ranges to build a balanced list.' },
  { title: 'Track your marks', text: 'Log every assessment and get your course and top-6 averages calculated automatically.' },
  { title: 'Never miss a deadline', text: 'Heart a program and its key dates show up in your calendar.' },
]

// How many programs each university has, for the "Universities covered" list.
const programCounts = allPrograms.reduce((counts, p) => counts.set(p.universityId, (counts.get(p.universityId) ?? 0) + 1), new Map())

// Signed-in students who finished onboarding get their dashboard; everyone else the landing page.
export default function Home() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (user && profile?.onboardingDone) return <Dashboard />
  return <Landing needsOnboarding={Boolean(user)} />
}

function Landing({ needsOnboarding }) {
  usePageTitle('')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function onSubmit(e) {
    e.preventDefault()
    navigate(query.trim() ? `/programs?q=${encodeURIComponent(query.trim())}` : '/programs')
  }

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
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-10 text-white sm:px-12 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">Plan your Ontario university application in one place.</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Browse {allPrograms.length} programs from {allUniversities.length} universities, check prerequisites, and track your
          grades and deadlines.
        </p>
        <form onSubmit={onSubmit} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Engineering" or "Waterloo"'
            className="w-full rounded-lg px-4 py-3 text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-4 focus:ring-white/30"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-5 py-3 font-medium hover:bg-slate-800">
            Search
          </button>
        </form>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Universities covered</h2>
          <Link to="/programs" className="text-sm font-medium text-brand-700 hover:underline">
            Browse all programs →
          </Link>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allUniversities.map((u) => (
            <li key={u.id}>
              <Link
                to={`/programs?uni=${u.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{u.name}</span>
                  <span className="block text-xs text-slate-500">{u.city}</span>
                </span>
                <span className="shrink-0 text-sm text-slate-500">{programCounts.get(u.id)} programs</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">More Ontario universities are being added. Data is updated from official websites every week.</p>
      </section>

      <section className="mt-12 flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Not sure where to start?</h2>
          <p className="mt-1 text-sm text-slate-600">Read short tips on interviews, supplementary applications, averages and offers.</p>
        </div>
        <Link to="/tips" className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Read the tips
        </Link>
      </section>
    </div>
  )
}
