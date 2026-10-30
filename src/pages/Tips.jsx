import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import Badge from '../components/Badge.jsx'
import tips from '../data/tips.json'
import universities from '../data/universities.json'
import { TIP_CATEGORIES, filterTips, sortTips } from '../lib/tips.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const universityById = new Map(universities.map((u) => [u.id, u]))
// Only offer universities that some tip mentions.
const tipUniversities = universities.filter((u) => tips.some((t) => t.universities.includes(u.id)))

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

const CATEGORY_TONES = {
  Interview: 'blue',
  'AIF / Supplementary': 'amber',
  'General Application': 'slate',
  'Grades & Averages': 'green',
  'Offers & Decisions': 'red',
}

function TipCard({ tip }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={CATEGORY_TONES[tip.category]}>{tip.category}</Badge>
        {tip.universities.map((id) => (
          <Badge key={id}>{universityById.get(id)?.shortName ?? id}</Badge>
        ))}
      </div>
      <h2 className="mt-3 font-semibold text-slate-900">{tip.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{tip.summary}</p>
      {tip.sourceUrl && (
        <a href={tip.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 text-sm font-medium text-brand-700 hover:underline">
          Discuss on {tip.source} ↗
        </a>
      )}
    </article>
  )
}

export default function Tips() {
  usePageTitle('Tips')
  const [params, setParams] = useSearchParams()
  const category = TIP_CATEGORIES.includes(params.get('cat')) ? params.get('cat') : ''
  const university = params.get('uni') ?? ''
  const query = params.get('q') ?? ''

  const results = useMemo(
    () => sortTips(filterTips(tips, { category, university, query }), university),
    [category, university, query],
  )

  function update(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Application tips</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Advice on interviews, supplementary applications, grades and offers — written for this site, based on questions Ontario
        applicants often ask. Always check the official university website for the final word.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Category">
        {['', ...TIP_CATEGORIES].map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => update('cat', c)}
            aria-pressed={category === c}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              category === c ? 'bg-brand-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {c || 'All tips'}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => update('q', e.target.value)}
          placeholder="Search tips, e.g. interview or scholarship"
          aria-label="Search tips"
          className={`${selectClass} sm:flex-1`}
        />
        <select className={selectClass} value={university} onChange={(e) => update('uni', e.target.value)} aria-label="University">
          <option value="">All universities</option>
          {tipUniversities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-sm text-slate-600">
        {results.length} {results.length === 1 ? 'tip' : 'tips'}
        {university && ' · general tips are included too'}
      </p>
      {results.length > 0 ? (
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No tips match. Try another category or clear the search.
        </div>
      )}
    </div>
  )
}
