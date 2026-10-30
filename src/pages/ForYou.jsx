import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import Badge from '../components/Badge.jsx'
import HeartButton from '../components/HeartButton.jsx'
import Spinner from '../components/Spinner.jsx'
import { allPrograms, allUniversities, courseName } from '../lib/data.js'
import { admissionAverage, formatMark } from '../lib/average.js'
import { assessProgram, CATEGORY_LABEL, FIELD_KEY_COURSES, MATCH_MARGIN, recommendFields, REACH_GAP } from '../lib/recommend.js'
import { formatRange, formatUniversity } from '../lib/format.js'
import { useStudent } from '../hooks/useStudent.js'
import { fromHere } from '../lib/backLink.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

const COLUMNS = [
  {
    key: 'safety',
    hint: `Your average is more than ${MATCH_MARGIN}% above the top of the range.`,
    header: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  { key: 'match', hint: `Your average is within ${MATCH_MARGIN}% of the top of the range (or above it, with a supplementary application).`, header: 'border-sky-200 bg-sky-50 text-sky-800' },
  { key: 'reach', hint: `Your average is below the top of the range, but no more than ${REACH_GAP}% under the bottom.`, header: 'border-amber-200 bg-amber-50 text-amber-800' },
]

// Within a column: safeties and matches with the most competitive programs first,
// reaches with the closest ones first.
const SORT = {
  safety: (a, b) => b.program.admissionRange.low - a.program.admissionRange.low,
  match: (a, b) => b.program.admissionRange.low - a.program.admissionRange.low,
  reach: (a, b) => a.program.admissionRange.low - b.program.admissionRange.low,
}

const PAGE = 8

export default function ForYou() {
  usePageTitle('For You')
  const student = useStudent()
  const [params, setParams] = useSearchParams()
  const fieldParam = params.get('field') ?? ''
  const university = params.get('uni') ?? ''

  const directions = useMemo(() => recommendFields(student.codes, student.markTable), [student.codes, student.markTable])
  const overall = useMemo(() => admissionAverage(null, student.markTable), [student.markTable])

  const { fields, columns, noRange, missingOne } = useMemo(() => {
    // '' = the recommended fields, 'all' = every field, otherwise one field.
    const fields = fieldParam === 'all' ? null : fieldParam ? [fieldParam] : directions.map((d) => d.field)
    const columns = { safety: [], match: [], reach: [] }
    let noRange = 0
    let missingOne = 0
    for (const p of allPrograms) {
      if (university && p.universityId !== university) continue
      if (fields && !p.field.some((f) => fields.includes(f))) continue
      const a = assessProgram(p, student.codes, student.markTable)
      if (a.eligibility.status === 'missingOne') missingOne++
      if (a.eligibility.status !== 'eligible') continue
      if (p.admissionRange?.low == null) noRange++
      else if (a.category) columns[a.category].push(a)
    }
    for (const key of Object.keys(columns)) columns[key].sort(SORT[key])
    return { fields, columns, noRange, missingOne }
  }, [student.codes, student.markTable, fieldParam, directions, university])

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

  if (student.loading) return <Spinner />

  if (student.codes.length === 0) {
    return (
      <Empty>
        Add your Grade 12 courses on your{' '}
        <Link to="/profile" className="font-medium text-brand-700 hover:underline">
          profile
        </Link>{' '}
        to get recommendations.
      </Empty>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">For You</h1>
      <p className="mt-1 text-slate-600">Programs you qualify for, sorted by how your average compares with their admission range.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Your top 6 average</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{formatMark(overall?.average)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {!overall
              ? 'No marks yet'
              : `${overall.estimated ? 'Estimated · ' : ''}${overall.courses.length} course${overall.courses.length === 1 ? '' : 's'}. Each program below uses its own required courses.`}
          </div>
        </div>

        {directions.map((d, i) => (
          <button
            key={d.field}
            type="button"
            onClick={() => update('field', fieldParam === d.field ? '' : d.field)}
            className={`rounded-xl border p-4 text-left shadow-sm transition ${
              fieldParam === d.field ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-600/40'
            }`}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Direction #{i + 1}</div>
            <div className="mt-1 font-semibold text-slate-900">{d.field}</div>
            <div className="mt-2 text-xs text-slate-600">
              You take {d.matched.length} of {FIELD_KEY_COURSES[d.field].length} key courses
            </div>
            {d.missing.length > 0 && (
              <div className="mt-1 text-xs text-slate-500" title={d.missing.map(courseName).join(', ')}>
                Not taking: {d.missing.join(', ')}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select className={selectClass} value={fieldParam} onChange={(e) => update('field', e.target.value)} aria-label="Field">
          <option value="">Recommended fields</option>
          <option value="all">All fields</option>
          {Object.keys(FIELD_KEY_COURSES).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className={selectClass} value={university} onChange={(e) => update('uni', e.target.value)} aria-label="University">
          <option value="">All universities</option>
          {allUniversities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {student.markTable.size === 0 ? (
        <Empty>
          Add marks to your courses (or your Grade 11 marks) on your{' '}
          <Link to="/profile" className="font-medium text-brand-700 hover:underline">
            profile
          </Link>{' '}
          so we can compare your average with each program.
        </Empty>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((c) => (
            <Column key={c.key} column={c} items={columns[c.key]} />
          ))}
        </div>
      )}

      <div className="mt-6 space-y-1 text-sm text-slate-600">
        {noRange > 0 && (
          <p>
            {noRange} more program{noRange === 1 ? '' : 's'} you qualify for {noRange === 1 ? 'doesn’t' : 'don’t'} publish an admission
            average (for example most of U of T), so {noRange === 1 ? 'it isn’t' : 'they aren’t'} sorted here.
          </p>
        )}
        {missingOne > 0 && (
          <p>
            You&apos;re one course away from {missingOne} more program{missingOne === 1 ? '' : 's'} —{' '}
            <Link to={fields?.length === 1 ? `/programs?field=${encodeURIComponent(fields[0])}` : '/programs'} className="font-medium text-brand-700 hover:underline">
              see them on the Programs page
            </Link>
            .
          </p>
        )}
      </div>

      <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Recommendations are a rough guide only. Admission ranges are from past years and change every year, universities calculate
        averages in different ways (we use your top 6 Grade 12 U/M courses, including each program&apos;s required courses), and
        supplementary applications or interviews can matter as much as grades. Always check the official website.
      </p>
    </div>
  )
}

function Column({ column, items }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, PAGE)

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className={`rounded-t-xl border-b px-4 py-3 ${column.header}`}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">{CATEGORY_LABEL[column.key]}</h2>
          <span className="text-sm">{items.length}</span>
        </div>
        <p className="mt-0.5 text-xs opacity-80">{column.hint}</p>
      </header>
      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">No programs here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((a) => (
            <Row key={a.program.id} assessment={a} />
          ))}
        </ul>
      )}
      {items.length > PAGE && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-auto border-t border-slate-100 py-2.5 text-sm font-medium text-brand-700 hover:bg-slate-50">
          {showAll ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  )
}

function Row({ assessment }) {
  const { program, admission, eligibility } = assessment
  const location = useLocation()
  return (
    <li className="flex items-start gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link to={`/programs/${program.id}`} state={fromHere(location)} className="font-medium text-slate-900 hover:text-brand-700">
          {program.name}
        </Link>
        <div className="truncate text-xs text-slate-500">{formatUniversity(program)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          <span>
            Range <span className="font-medium text-slate-900">{formatRange(program.admissionRange)}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            You <span className="font-medium text-slate-900">{formatMark(admission.average)}</span>
            {admission.estimated && ' est.'}
          </span>
          {program.supplementary?.required && <Badge tone="amber">Supplementary</Badge>}
          {eligibility.belowMinimum.length > 0 && (
            <Badge tone="amber">Below {eligibility.belowMinimum.map((b) => `${b.code} min`).join(', ')}</Badge>
          )}
        </div>
      </div>
      <HeartButton programId={program.id} className="-mr-1.5 shrink-0" />
    </li>
  )
}

function Empty({ children }) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
      {children}
    </div>
  )
}
