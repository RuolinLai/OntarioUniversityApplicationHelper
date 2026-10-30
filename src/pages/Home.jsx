import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { allPrograms, allUniversities } from '../lib/data.js'

const features = [
  { title: 'Find programs you qualify for', text: 'Enter your Grade 12 courses and see which programs match their prerequisites.' },
  { title: 'Safety, match & reach', text: 'Compare your average with published admission ranges to build a balanced list.' },
  { title: 'Track your marks', text: 'Log every assessment and get your course and top-6 averages calculated automatically.' },
  { title: 'Never miss a deadline', text: 'Heart a program and its key dates show up in your calendar.' },
]

export default function Home() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function onSubmit(e) {
    e.preventDefault()
    navigate(query.trim() ? `/programs?q=${encodeURIComponent(query.trim())}` : '/programs')
  }

  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-14 text-white sm:px-12">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">Plan your Ontario university application in one place.</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Browse {allPrograms.length} programs from {allUniversities.length} universities, check prerequisites, and track your
          grades and deadlines.
        </p>
        <form onSubmit={onSubmit} className="mt-8 flex max-w-xl gap-2">
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

      <div className="mt-10 text-center">
        <Link to="/programs" className="font-medium text-brand-700 hover:underline">
          Browse all programs →
        </Link>
      </div>
    </div>
  )
}
