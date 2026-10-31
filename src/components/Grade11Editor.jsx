import { useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import { grade11Courses, courseName } from '../lib/data.js'
import { averageOf, formatMark, grade11PrerequisitesOf } from '../lib/average.js'
import { inputClass, parseMark, primaryButton, secondaryButton } from './form.js'

const leadsTo = new Map(grade11Courses.map((c) => [c.code, c.leadsTo]))

// Enter Grade 11 final marks. Courses that lead to the student's Grade 12 courses are listed first;
// others can be added. hidden: prerequisites the student removed before (users/{uid}.hiddenGrade11),
// so they aren't suggested again. onSave receives ({ code: mark }, hidden).
export default function Grade11Editor({ grade12Codes, existing, hidden = [], onSave, saveLabel = 'Save', saving, onBack }) {
  const suggested = [...new Set(grade12Codes.flatMap(grade11PrerequisitesOf))]
  const [marks, setMarks] = useState(() => Object.fromEntries(existing.map((g) => [g.code, String(g.mark)])))
  const [shown, setShown] = useState(() => [
    ...new Set([...suggested.filter((code) => !hidden.includes(code)), ...existing.map((g) => g.code)]),
  ])
  const [adding, setAdding] = useState('')

  const invalid = shown.filter((code) => Number.isNaN(parseMark(marks[code] ?? '')))
  const addable = grade11Courses.filter((c) => !shown.includes(c.code))
  const entered = shown.map((code) => parseMark(marks[code] ?? '')).filter((m) => m != null && !Number.isNaN(m))
  const prerequisites = shown.filter((code) => suggested.includes(code))
  const others = shown.filter((code) => !suggested.includes(code))
  const missing = prerequisites.filter((code) => parseMark(marks[code] ?? '') == null).length

  function submit(e) {
    e.preventDefault()
    if (invalid.length) return
    const result = {}
    for (const code of shown) {
      const mark = parseMark(marks[code] ?? '')
      if (mark !== null) result[code] = mark
    }
    // Prerequisites not on the list were removed by the student; adding one back un-hides it.
    onSave(result, suggested.filter((code) => !shown.includes(code)))
  }

  function card(code) {
    const bad = invalid.includes(code)
    const empty = parseMark(marks[code] ?? '') == null
    const targets = (leadsTo.get(code) ?? []).filter((c) => grade12Codes.includes(c))
    return (
      <li
        key={code}
        className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm ${
          suggested.includes(code) && empty ? 'border-amber-300' : 'border-slate-200'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700">{code}</span>
            <button
              type="button"
              onClick={() => setShown((prev) => prev.filter((c) => c !== code))}
              className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
              aria-label={`Remove ${code}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1.5 font-semibold leading-snug text-slate-900">{courseName(code)}</div>
          {targets.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
              Estimates
              {targets.map((t) => (
                <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="any"
            placeholder="—"
            value={marks[code] ?? ''}
            onChange={(e) => setMarks((prev) => ({ ...prev, [code]: e.target.value }))}
            className={`${inputClass} w-20 text-center text-xl font-bold tabular-nums ${bad ? 'border-brand-600' : ''}`}
            aria-label={`${code} mark`}
            aria-invalid={bad}
          />
          <span className="text-base font-medium text-slate-500">%</span>
        </label>
      </li>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Grade 11 average</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{formatMark(averageOf(entered))}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Marks entered</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {entered.length}
            <span className="text-lg font-medium text-slate-400"> / {shown.length}</span>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${missing ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className={`text-sm ${missing ? 'text-amber-800' : 'text-emerald-800'}`}>Prerequisites missing a mark</div>
          <div className={`mt-1 text-3xl font-bold tabular-nums ${missing ? 'text-amber-900' : 'text-emerald-900'}`}>{missing}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Your Grade 11 marks stand in for Grade 12 marks you don&apos;t have yet. Leave a mark empty if you don&apos;t know it.
      </p>

      {shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Add the Grade 11 courses you took below.
        </p>
      )}

      {prerequisites.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Prerequisites for your Grade 12 courses</h3>
          <p className="text-sm text-slate-500">These matter most: each one estimates the Grade 12 course it leads to.</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">{prerequisites.map(card)}</ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Other Grade 11 courses</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">{others.map(card)}</ul>
        </section>
      )}

      {addable.length > 0 && (
        <div className="mt-4 flex gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className={`${inputClass} sm:w-96`} aria-label="Add a Grade 11 course">
            <option value="">Add another Grade 11 course…</option>
            {addable.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${secondaryButton} inline-flex items-center gap-1`}
            disabled={!adding}
            onClick={() => {
              setShown((prev) => [...prev, adding])
              setAdding('')
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>
      )}

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-cream/95 py-4">
        {invalid.length > 0 && <span className="mr-auto text-sm text-red-700">Marks must be between 0 and 100.</span>}
        {onBack && (
          <button type="button" className={secondaryButton} onClick={onBack}>
            Back
          </button>
        )}
        <button type="submit" className={primaryButton} disabled={saving || invalid.length > 0}>
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </form>
  )
}
