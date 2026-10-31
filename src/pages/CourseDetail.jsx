import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ClipboardList, Plus, Target, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { saveGrade12Course, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import { courseAverage, estimateFromGrade11, estimateMode, estimateSource, formatMark } from '../lib/average.js'
import { COURSE_STATUS, courseName } from '../lib/data.js'
import Spinner from '../components/Spinner.jsx'
import { fieldClass, parseMark, primaryButton, secondaryButton } from '../components/form.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { BackButton } from '../components/LinkButton.jsx'
import MarkBar, { MARK_COLOR } from '../components/charts/MarkBar.jsx'

export default function CourseDetail() {
  usePageTitle('Course marks')
  const { courseId } = useParams()
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()

  if (grade12.loading || grade11.loading) return <Spinner />

  const course = grade12.items.find((c) => c.code === courseId)
  if (!course) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{courseId} isn&apos;t one of your courses</h1>
        <BackButton to="/profile" className="mt-4">
          Back to profile
        </BackButton>
      </div>
    )
  }
  // key: start a fresh draft if the user switches course.
  return <CourseEditor key={course.code} course={course} grade11={grade11.items} />
}

// Inputs keep what was typed (strings); numbers are parsed when saving.
function toDraft(course) {
  return {
    status: course.status ?? 'in_progress',
    finalMark: course.finalMark == null ? '' : String(course.finalMark),
    assessments: (course.assessments ?? []).map((a) => ({
      id: a.id ?? crypto.randomUUID(),
      name: a.name ?? '',
      mark: a.mark == null ? '' : String(a.mark),
      outOf: a.outOf == null ? '100' : String(a.outOf),
      weight: a.weight == null ? '' : String(a.weight),
    })),
  }
}

function positive(text) {
  const n = Number(text)
  return text !== '' && Number.isFinite(n) && n > 0
}

function CourseEditor({ course, grade11 }) {
  const { user, profile } = useAuth()
  const mode = estimateMode(profile?.estimateMode)
  const [saved, setSaved] = useState(() => toDraft(course))
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  // Warn before closing or refreshing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const average = courseAverage(draft.assessments)
  const finalMark = parseMark(draft.finalMark)
  const estimate = estimateFromGrade11(course.code, grade11, mode)
  const [goal, setGoal] = useState('90')
  const totalWeight = draft.assessments.reduce((sum, a) => sum + (positive(a.weight) ? Number(a.weight) : 0), 0)
  const marked = draft.assessments.filter(
    (a) => a.mark !== '' && Number(a.mark) >= 0 && positive(a.outOf) && (a.weight === '' || positive(a.weight)),
  )
  const markedCount = marked.length
  const markedWeight = marked.reduce((sum, a) => sum + Number(a.weight), 0)
  // Weights adding up to at most 100 are read as percentages of the course. Progress and the goal
  // calculator need every assessment to have one, since the weight is optional.
  const percentWeights = draft.assessments.every((a) => a.weight !== '') && totalWeight > 0 && totalWeight <= 100
  const chartRows = marked.map((a) => ({ id: a.id, name: a.name.trim() || 'Untitled', weight: a.weight, pct: (Number(a.mark) / Number(a.outOf)) * 100 }))

  const rowErrors = draft.assessments.map((a) => {
    if (!a.name.trim()) return 'Name is required'
    if (!positive(a.outOf)) return 'Out of must be more than 0'
    if (a.weight !== '' && !positive(a.weight)) return 'Weight must be more than 0'
    if (a.mark !== '' && !(Number(a.mark) >= 0)) return 'Mark can’t be negative'
    return null
  })
  const invalid = Number.isNaN(finalMark) || rowErrors.some(Boolean)

  function updateRow(id, field, value) {
    setDraft((d) => ({ ...d, assessments: d.assessments.map((a) => (a.id === id ? { ...a, [field]: value } : a)) }))
  }

  function addRow() {
    setDraft((d) => ({ ...d, assessments: [...d.assessments, { id: crypto.randomUUID(), name: '', mark: '', outOf: '100', weight: '' }] }))
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      await saveGrade12Course(user.uid, course.code, {
        status: draft.status,
        finalMark,
        assessments: draft.assessments.map((a) => ({
          id: a.id,
          name: a.name.trim(),
          mark: a.mark === '' ? null : Number(a.mark),
          outOf: Number(a.outOf),
          weight: a.weight === '' ? null : Number(a.weight),
        })),
      })
      setSaved(draft)
      setMessage({ ok: true, text: 'Saved.' })
    } catch {
      setMessage({ ok: false, text: 'Couldn’t save. Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const used =
    finalMark != null && !Number.isNaN(finalMark)
      ? { mark: finalMark, label: 'From your final mark' }
      : average != null
        ? { mark: average, label: 'Your current average' }
        : estimate
          ? { mark: estimate.mark, label: `Estimated from your ${estimateSource(estimate, mode)} mark`, estimated: true }
          : null
  const grade11Mark = estimateFromGrade11(course.code, grade11, 'grade11')
  const difference = used && !used.estimated && grade11Mark ? used.mark - grade11Mark.mark : null

  return (
    <div className="max-w-5xl">
      <BackButton to="/profile">Profile</BackButton>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-sm font-semibold text-brand-700">{course.code}</span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{courseName(course.code)}</h1>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="radiogroup" aria-label="Status">
          {Object.entries(COURSE_STATUS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={draft.status === value}
              onClick={() => setDraft((d) => ({ ...d, status: value }))}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                draft.status === value ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-300">Mark used for your averages</p>
            <p className="mt-1 text-6xl font-bold tabular-nums">
              {used ? `${used.estimated ? '~' : ''}${formatMark(used.mark)}` : '—'}
            </p>
            <p className="mt-2 text-sm text-slate-300">{used ? used.label : 'Add an assessment below to get started'}</p>
            <MarkBar mark={used?.mark ?? null} estimated={used?.estimated} className="mt-5 h-2.5" track="bg-white/15" />
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400" aria-hidden="true">
              <span>0</span>
              <span>50</span>
              <span>100%</span>
            </div>
            {grade11Mark && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                Grade 11 {grade11Mark.from}: <span className="font-semibold text-white">{formatMark(grade11Mark.mark)}</span>
                {difference != null && Math.abs(difference) >= 0.05 && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      difference > 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
                    }`}
                  >
                    {difference > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                    {difference > 0 ? '+' : '−'}
                    {Math.round(Math.abs(difference) * 10) / 10} vs Grade 11
                  </span>
                )}
              </p>
            )}
          </div>
        </section>

        <div className="grid content-start gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Target className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Course progress
            </h2>
            {percentWeights ? (
              <>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="text-slate-600">Marked so far</span>
                  <span className="text-lg font-bold tabular-nums text-slate-900">{Math.round(markedWeight * 10) / 10}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.min(markedWeight, 100)}%` }} />
                </div>
                {markedWeight > 0 && markedWeight < 100 && (
                  <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-slate-700">
                    <label className="flex flex-wrap items-center gap-2">
                      To finish with
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="any"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className={`${fieldClass} w-20 py-1 text-center font-semibold`}
                        aria-label="Goal mark"
                      />
                      %
                    </label>
                    <p className="mt-2">{goalMessage(average, markedWeight, parseMark(goal))}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {draft.assessments.length
                  ? `${markedCount} of ${draft.assessments.length} assessments marked. Give every assessment a percentage weight (adding up to 100) to see what you need on the rest.`
                  : 'Add assessments with percentage weights to track how much of the course is marked.'}
              </p>
            )}
          </section>

          <label className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span>
              <span className="block font-semibold text-slate-900">Final mark</span>
              <span className="block text-sm text-slate-500">Optional. Replaces the average once you have it.</span>
            </span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="—"
                value={draft.finalMark}
                onChange={(e) => setDraft((d) => ({ ...d, finalMark: e.target.value }))}
                className={`${fieldClass} w-24 text-center text-xl font-bold ${Number.isNaN(finalMark) ? 'border-brand-600' : ''}`}
              />
              <span className="font-medium text-slate-500">%</span>
            </span>
          </label>
        </div>
      </div>

      {chartRows.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Your marks</h2>
          <p className="text-sm text-slate-500">Each marked assessment as a percentage.</p>
          <ul className="mt-4 space-y-2.5" aria-label="Marks on each assessment">
            {chartRows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(6rem,12rem)_1fr] items-center gap-3"
                title={`${r.name}: ${formatMark(r.pct)}${r.weight ? ` · weight ${r.weight}` : ''}`}
              >
                <span className="truncate text-sm text-slate-700">{r.name}</span>
                <span className="flex items-center gap-2">
                  <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.min(r.pct, 100) * 0.85}%`, minWidth: 4, background: MARK_COLOR }} />
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800">{Math.round(r.pct * 10) / 10}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assessments</h2>
          <p className="text-sm text-slate-500">Tests, assignments and projects. Leave the mark empty for work that isn&apos;t marked yet.</p>
        </div>
        <button type="button" className={`${primaryButton} inline-flex items-center gap-1`} onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add assessment
        </button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Mark</th>
              <th className="px-3 py-3 font-medium">Out of</th>
              <th className="px-3 py-3 font-medium">Weight</th>
              <th className="px-3 py-3 text-right font-medium">Result</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draft.assessments.map((a, i) => {
              const pct = a.mark !== '' && positive(a.outOf) ? (Number(a.mark) / Number(a.outOf)) * 100 : null
              return (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-2.5">
                    <input
                      value={a.name}
                      onChange={(e) => updateRow(a.id, 'name', e.target.value)}
                      placeholder="e.g. Unit 1 Test"
                      className={`${fieldClass} min-w-44 font-medium`}
                      aria-label="Assessment name"
                    />
                    {rowErrors[i] && <div className="mt-1 text-xs text-red-700">{rowErrors[i]}</div>}
                  </td>
                  {['mark', 'outOf', 'weight'].map((field) => (
                    <td key={field} className="px-3 py-2.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={a[field]}
                        onChange={(e) => updateRow(a.id, field, e.target.value)}
                        placeholder={field === 'mark' ? 'Not marked' : field === 'weight' ? 'Optional' : ''}
                        className={`${fieldClass} w-24 tabular-nums`}
                        aria-label={field === 'outOf' ? 'Out of' : field[0].toUpperCase() + field.slice(1)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right">
                    {pct == null ? (
                      <span className="inline-block py-2 text-slate-400">Not marked</span>
                    ) : (
                      <span className="inline-block py-1.5 text-lg font-bold tabular-nums text-slate-900">{formatMark(pct)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, assessments: d.assessments.filter((x) => x.id !== a.id) }))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                      aria-label={`Delete ${a.name || 'assessment'}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {draft.assessments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="mt-2 font-medium text-slate-700">No assessments yet</p>
                  <p className="text-sm text-slate-500">Add your first test or assignment to start tracking this course.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        The weight is optional. Leave it empty if you don&apos;t know it and the assessment counts as much as the average of
        the others (with no weights at all, it&apos;s a plain average). Weights can be percentages (e.g. 15 for 15%) or any
        relative numbers.
      </p>

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-cream/95 py-4">
        {message && !message.ok && <span className="text-sm text-red-700">{message.text}</span>}
        {message?.ok && !dirty && <span className="text-sm text-emerald-700">{message.text}</span>}
        {dirty && message?.ok !== false && <span className="text-sm text-slate-500">Unsaved changes</span>}
        <button type="button" className={secondaryButton} disabled={!dirty || saving} onClick={() => setDraft(saved)}>
          Discard
        </button>
        <button type="button" className={primaryButton} disabled={!dirty || invalid || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// "You need 87.5% on the remaining 40%." for a goal, given the average so far over `marked`% of the course.
function goalMessage(average, marked, goal) {
  if (goal == null || Number.isNaN(goal)) return 'Enter a goal between 0 and 100.'
  const remaining = 100 - marked
  const needed = (goal * 100 - average * marked) / remaining
  const rest = `the remaining ${Math.round(remaining * 10) / 10}%`
  if (needed <= 0) return `You've already reached ${goal}%, whatever happens on ${rest}.`
  if (needed > 100) {
    const best = (average * marked + 100 * remaining) / 100
    return `Out of reach this time: even 100% on ${rest} gets you ${formatMark(best)}.`
  }
  return (
    <>
      You need <strong className="text-base text-slate-900">{formatMark(needed)}</strong> on average on {rest}.
    </>
  )
}
