import { useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import ProgramCard from '../components/ProgramCard.jsx'
import { allPrograms, allUniversities, allFields } from '../lib/data.js'
import { searchPrograms, SORT_OPTIONS } from '../lib/search.js'

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

export default function Programs() {
  // Search state lives in the URL so results survive refresh, back button and sharing.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const university = params.get('uni') ?? ''
  const field = params.get('field') ?? ''
  const coop = params.get('coop') === '1'
  const supplementary = params.get('supp') ?? 'any'
  const sort = params.get('sort') ?? 'name'

  const deferredQuery = useDeferredValue(query)

  const results = useMemo(
    () => searchPrograms(allPrograms, { query: deferredQuery, university, field, coop, supplementary, sort }),
    [deferredQuery, university, field, coop, supplementary, sort],
  )

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
        </span>
        {hasFilters && (
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setParams({}, { replace: true })}>
            Clear all
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {results.map((p) => (
            <ProgramCard key={p.id} program={p} fromSearch={params.toString()} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No programs match your search. Try fewer words or clear the filters.
        </div>
      )}
    </div>
  )
}
