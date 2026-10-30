import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx'
import { saveGrade12Course, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import { courseAverage, estimateFromGrade11, formatMark } from '../lib/average.js'
import { COURSE_STATUS, courseName } from '../lib/data.js'
import Spinner from '../components/Spinner.jsx'
import { inputClass, parseMark, primaryButton, secondaryButton } from '../components/form.js'

export default function CourseDetail() {
  const { courseId } = useParams()
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()

  if (grade12.loading || grade11.loading) return <Spinner />

  const course = grade12.items.find((c) => c.code === courseId)
  if (!course) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{courseId} isn&apos;t one of your courses</h1>
        <Link to="/profile" className="mt-4 inline-block font-medium text-brand-700 hover:underline">
          ← Back to profile
        </Link>
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
  const { user } = useAuth()
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
  const estimate = estimateFromGrade11(course.code, grade11)
  const totalWeight = draft.assessments.reduce((sum, a) => sum + (positive(a.weight) ? Number(a.weight) : 0), 0)

  const rowErrors = draft.assessments.map((a) => {
    if (!a.name.trim()) return 'Name is required'
    if (!positive(a.outOf)) return 'Out of must be more than 0'
    if (!positive(a.weight)) return 'Weight must be more than 0'
    if (a.mark !== '' && !(Number(a.mark) >= 0)) return 'Mark can’t be negative'
    return null
  })
  const invalid = Number.isNaN(finalMark) || rowErrors.some(Boolean)

  function updateRow(id, field, value) {
    setDraft((d) => ({ ...d, assessments: d.assessments.map((a) => (a.id === id ? { ...a, [field]: value } : a)) }))
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
          weight: Number(a.weight),
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

  return (
    <div className="max-w-4xl">
      <Link to="/profile" className="text-sm font-medium text-brand-700 hover:underline">
        ← Profile
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-sm text-slate-500">{course.code}</div>
          <h1 className="text-2xl font-bold text-slate-900">{courseName(course.code)}</h1>
        </div>
        <select
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          className={`${inputClass} w-auto`}
          aria-label="Status"
        >
          {Object.entries(COURSE_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Current average</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatMark(average)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {totalWeight > 0 ? `From assessments worth ${Math.round(totalWeight * 10) / 10} weight in total` : 'Add assessments below'}
          </div>
        </div>
        <label className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-sm text-slate-500">Final mark (optional)</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              value={draft.finalMark}
              onChange={(e) => setDraft((d) => ({ ...d, finalMark: e.target.value }))}
              className={`${inputClass} w-24 ${Number.isNaN(finalMark) ? 'border-brand-600' : ''}`}
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
          <span className="mt-1 block text-xs text-slate-500">Used instead of the average once you have it.</span>
        </label>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Mark used for averages</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {finalMark != null && !Number.isNaN(finalMark) ? formatMark(finalMark) : average != null ? formatMark(average) : estimate ? `~${formatMark(estimate.mark)}` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {finalMark != null && !Number.isNaN(finalMark)
              ? 'Final mark'
              : average != null
                ? 'Current average'
                : estimate
                  ? `Estimated from ${estimate.from}`
                  : 'No marks yet'}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Assessments</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Mark</th>
              <th className="px-3 py-2 font-medium">Out of</th>
              <th className="px-3 py-2 font-medium">Weight</th>
              <th className="px-3 py-2 font-medium">%</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draft.assessments.map((a, i) => {
              const pct = a.mark !== '' && positive(a.outOf) ? (Number(a.mark) / Number(a.outOf)) * 100 : null
              return (
                <tr key={a.id} className="align-top">
                  <td className="px-3 py-2">
                    <input
                      value={a.name}
                      onChange={(e) => updateRow(a.id, 'name', e.target.value)}
                      placeholder="e.g. Unit 1 Test"
                      className={`${inputClass} min-w-40`}
                      aria-label="Assessment name"
                    />
                    {rowErrors[i] && <div className="mt-1 text-xs text-brand-700">{rowErrors[i]}</div>}
                  </td>
                  {['mark', 'outOf', 'weight'].map((field) => (
                    <td key={field} className="px-3 py-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={a[field]}
                        onChange={(e) => updateRow(a.id, field, e.target.value)}
                        placeholder={field === 'mark' ? 'Not marked' : ''}
                        className={`${inputClass} w-24`}
                        aria-label={field === 'outOf' ? 'Out of' : field[0].toUpperCase() + field.slice(1)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-4 text-slate-600">{formatMark(pct)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, assessments: d.assessments.filter((x) => x.id !== a.id) }))}
                      className="p-2 text-slate-400 hover:text-brand-700"
                      aria-label={`Delete ${a.name || 'assessment'}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            {draft.assessments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No assessments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className={`${secondaryButton} mt-3`}
        onClick={() =>
          setDraft((d) => ({ ...d, assessments: [...d.assessments, { id: crypto.randomUUID(), name: '', mark: '', outOf: '100', weight: '' }] }))
        }
      >
        + Add assessment
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Weights can be percentages (e.g. 15 for 15%) or any relative numbers. Leave the mark empty for work that isn&apos;t
        marked yet — it won&apos;t count toward the average.
      </p>

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/95 py-4">
        {message && !message.ok && <span className="text-sm text-brand-700">{message.text}</span>}
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
