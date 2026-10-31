import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ClipboardCheck, ExternalLink, GraduationCap, Lightbulb, Mail, Mic, PenLine, Search } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import tips from '../data/tips.json'
import universities from '../data/universities.json'
import { TIP_CATEGORIES, TIP_KINDS, filterTips, sortTips } from '../lib/tips.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const universityById = new Map(universities.map((u) => [u.id, u]))
// Only offer universities that some tip mentions.
const tipUniversities = universities.filter((u) => tips.some((t) => t.universities.includes(u.id)))

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

// Icon and colours for each category (used on the filter chips and the cards).
const CATEGORY_STYLE = {
  Interview: { icon: Mic, tile: 'bg-sky-50 text-sky-700' },
  'AIF / Supplementary': { icon: PenLine, tile: 'bg-amber-50 text-amber-700' },
  'General Application': { icon: ClipboardCheck, tile: 'bg-slate-100 text-slate-700' },
  'Grades & Averages': { icon: GraduationCap, tile: 'bg-emerald-50 text-emerald-700' },
  'Offers & Decisions': { icon: Mail, tile: 'bg-brand-50 text-brand-700' },
}

// "2026-05" → "May 2026"
const formatPosted = (yearMonth) =>
  new Date(`${yearMonth}-01T00:00:00`).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })

function TipCard({ tip }) {
  const [open, setOpen] = useState(false)
  const { icon: Icon, tile } = CATEGORY_STYLE[tip.category]
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`} title={tip.category}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{tip.category}</p>
          <h2 className="font-semibold leading-snug text-slate-900">{tip.title}</h2>
        </div>
      </div>
      {tip.universities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tip.universities.map((id) => (
            <Badge key={id}>{universityById.get(id)?.shortName ?? id}</Badge>
          ))}
        </div>
      )}
      <p className={`mt-3 flex-1 text-sm leading-relaxed text-slate-600 ${open ? '' : 'line-clamp-3'}`}>{tip.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="font-medium text-slate-700 hover:text-slate-900"
          aria-expanded={open}
        >
          {open ? 'Show less' : 'Read more'}
        </button>
        {tip.sourceUrl ? (
          <a
            href={tip.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            From {tip.source}
            {tip.posted && ` · ${formatPosted(tip.posted)}`} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-xs text-slate-500">{tip.source}</span>
        )}
      </div>
    </article>
  )
}

export default function Tips() {
  usePageTitle('Tips')
  const [params, setParams] = useSearchParams()
  const category = TIP_CATEGORIES.includes(params.get('cat')) ? params.get('cat') : ''
  const kind = TIP_KINDS.some((k) => k.id === params.get('src')) ? params.get('src') : ''
  const university = params.get('uni') ?? ''
  const query = params.get('q') ?? ''

  const results = useMemo(
    () => sortTips(filterTips(tips, { category, kind, university, query }), university),
    [category, kind, university, query],
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
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Lightbulb className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application tips</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            General advice written for this site, plus summaries of Reddit posts from real applicants (linked to the original
            post). Reddit experiences are individual cases, not official rules — always check official websites.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Category">
        {['', ...TIP_CATEGORIES].map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => update('cat', c)}
            aria-pressed={category === c}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              category === c ? 'bg-brand-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {(() => {
              const Icon = c ? CATEGORY_STYLE[c].icon : Lightbulb
              return <Icon className="h-4 w-4" aria-hidden="true" />
            })()}
            {c || 'All tips'}
            <span className={`text-xs tabular-nums ${category === c ? 'text-white/80' : 'text-slate-400'}`}>
              {filterTips(tips, { category: c, kind }).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Search tips, e.g. interview or scholarship"
            aria-label="Search tips"
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select className={selectClass} value={kind} onChange={(e) => update('src', e.target.value)} aria-label="Source">
          <option value="">All sources</option>
          {TIP_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label} ({tips.filter((t) => t.kind === k.id).length})
            </option>
          ))}
        </select>
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
