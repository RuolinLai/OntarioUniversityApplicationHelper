import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import ProgramCard from '../components/ProgramCard.jsx'
import { allPrograms, allUniversities, allFields } from '../lib/data.js'
import { searchPrograms, SORT_OPTIONS } from '../lib/search.js'
import { assessProgram } from '../lib/recommend.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useStudent } from '../hooks/useStudent.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

// Eligibility filter for signed-in students (design.md 7.3: not-eligible programs hidden by default).
const ELIGIBILITY_FILTERS = {
  hide: 'Hide not eligible',
  eligible: 'Eligible only',
  all: 'All programs',
}

// Rendering ~1000 cards at once is slow on phones, so show them a page at a time.
const PAGE_SIZE = 60

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

export default function Programs() {
  usePageTitle('Programs')
  // Search state lives in the URL so results survive refresh, back button and sharing.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const university = params.get('uni') ?? ''
  const field = params.get('field') ?? ''
  const coop = params.get('coop') === '1'
  const supplementary = params.get('supp') ?? 'any'
  const sort = params.get('sort') ?? 'name'
  const eligibilityFilter = ELIGIBILITY_FILTERS[params.get('elig')] ? params.get('elig') : 'hide'

  const { user } = useAuth()
  const student = useStudent()
  // Only once the student has entered courses — otherwise everything would be "not eligible".
  const showEligibility = Boolean(user) && !student.loading && student.codes.length > 0

  const deferredQuery = useDeferredValue(query)

  const searched = useMemo(
    () => searchPrograms(allPrograms, { query: deferredQuery, university, field, coop, supplementary, sort }),
    [deferredQuery, university, field, coop, supplementary, sort],
  )

  const assessments = useMemo(
    () => (showEligibility ? new Map(allPrograms.map((p) => [p.id, assessProgram(p, student.codes, student.markTable)])) : null),
    [showEligibility, student.codes, student.markTable],
  )

  const results = useMemo(() => {
    if (!assessments || eligibilityFilter === 'all') return searched
    return searched.filter((p) => {
      const { status } = assessments.get(p.id).eligibility
      if (eligibilityFilter === 'eligible') return status === 'eligible'
      return status !== 'notEligible'
    })
  }, [searched, assessments, eligibilityFilter])
  const hiddenCount = searched.length - results.length

  // Start from the first page again whenever the search or filters change.
  const [shown, setShown] = useState({ key: '', count: PAGE_SIZE })
  const pageKey = params.toString()
  const shownCount = shown.key === pageKey ? shown.count : PAGE_SIZE
  const visible = results.slice(0, shownCount)

  function update(key, value, defaultValue = '') {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === defaultValue) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const hasFilters = query || university || field || coop || supplementary !== 'any'

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
      <p className="mt-1 text-slate-600">
        Search {allPrograms.length} programs across {allUniversities.length} Ontario universities.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => update('q', e.target.value)}
            placeholder='Search by program or university, e.g. "Computer Science" or "McMaster health"'
            className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            autoFocus
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className={selectClass} value={university} onChange={(e) => update('uni', e.target.value)} aria-label="University">
            <option value="">All universities</option>
            {allUniversities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select className={selectClass} value={field} onChange={(e) => update('field', e.target.value)} aria-label="Field">
            <option value="">All fields</option>
            {allFields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={supplementary}
            onChange={(e) => update('supp', e.target.value, 'any')}
            aria-label="Supplementary application"
          >
            <option value="any">Any supplementary</option>
            <option value="none">No supplementary</option>
            <option value="required">Supplementary required</option>
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={coop}
              onChange={(e) => update('coop', e.target.checked ? '1' : '')}
              className="accent-brand-700"
            />
            Co-op only
          </label>

          {showEligibility && (
            <select
              className={selectClass}
              value={eligibilityFilter}
              onChange={(e) => update('elig', e.target.value, 'hide')}
              aria-label="Eligibility"
            >
              {Object.entries(ELIGIBILITY_FILTERS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}

          <select
            className={`${selectClass} sm:ml-auto`}
            value={sort}
            onChange={(e) => update('sort', e.target.value, 'name')}
            aria-label="Sort by"
          >
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                Sort: {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
        <span>
          {results.length} {results.length === 1 ? 'program' : 'programs'}
          {hiddenCount > 0 && ` · ${hiddenCount} hidden based on your courses`}
        </span>
        {hasFilters && (
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setParams({}, { replace: true })}>
            Clear all
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {visible.map((p) => (
              <ProgramCard key={p.id} program={p} assessment={assessments?.get(p.id)} />
            ))}
          </div>
          {visible.length < results.length && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShown({ key: pageKey, count: shownCount + PAGE_SIZE })}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Show more ({results.length - visible.length} left)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No programs match your search. Try fewer words or clear the filters.
        </div>
      )}
    </div>
  )
}
