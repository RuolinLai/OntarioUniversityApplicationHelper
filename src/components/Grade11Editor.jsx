import { useState } from 'react'
import { grade11Courses, courseName } from '../lib/data.js'
import { grade11PrerequisitesOf } from '../lib/average.js'
import { inputClass, parseMark, primaryButton, secondaryButton } from './form.js'

// Enter Grade 11 final marks. Courses that lead to the student's Grade 12 courses are listed first;
// others can be added. onSave receives { code: mark }.
export default function Grade11Editor({ grade12Codes, existing, onSave, saveLabel = 'Save', saving, onBack }) {
  const suggested = [...new Set(grade12Codes.flatMap(grade11PrerequisitesOf))]
  const [marks, setMarks] = useState(() => Object.fromEntries(existing.map((g) => [g.code, String(g.mark)])))
  const [shown, setShown] = useState(() => [...new Set([...suggested, ...existing.map((g) => g.code)])])
  const [adding, setAdding] = useState('')

  const invalid = shown.filter((code) => Number.isNaN(parseMark(marks[code] ?? '')))
  const addable = grade11Courses.filter((c) => !shown.includes(c.code))

  function submit(e) {
    e.preventDefault()
    if (invalid.length) return
    const result = {}
    for (const code of shown) {
      const mark = parseMark(marks[code] ?? '')
      if (mark !== null) result[code] = mark
    }
    onSave(result)
  }

  return (
    <form onSubmit={submit}>
      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Add the Grade 11 courses you took below.
        </p>
      )}

      {shown.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {shown.map((code) => {
            const bad = invalid.includes(code)
            return (
              <div key={code} className="flex items-center gap-3 px-4 py-3">
                <span className="w-14 font-mono text-xs text-slate-500">{code}</span>
                <span className="flex-1 text-sm">
                  {courseName(code)}
                  {suggested.includes(code) && <span className="ml-2 text-xs text-slate-400">prerequisite</span>}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Mark"
                  value={marks[code] ?? ''}
                  onChange={(e) => setMarks((prev) => ({ ...prev, [code]: e.target.value }))}
                  className={`${inputClass} w-24 ${bad ? 'border-brand-600' : ''}`}
                  aria-label={`${code} mark`}
                  aria-invalid={bad}
                />
                <span className="text-sm text-slate-500">%</span>
                <button
                  type="button"
                  onClick={() => setShown((prev) => prev.filter((c) => c !== code))}
                  className="text-slate-400 hover:text-brand-700"
                  aria-label={`Remove ${code}`}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {addable.length > 0 && (
        <div className="mt-3 flex gap-2">
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
            className={secondaryButton}
            disabled={!adding}
            onClick={() => {
              setShown((prev) => [...prev, adding])
              setAdding('')
            }}
          >
            Add
          </button>
        </div>
      )}

      {invalid.length > 0 && <p className="mt-3 text-sm text-brand-700">Marks must be between 0 and 100.</p>}
      <p className="mt-3 text-xs text-slate-500">
        Leave a mark empty if you don&apos;t have it. Grade 11 marks are used to estimate Grade 12 marks you don&apos;t have yet.
      </p>

      <div className="mt-6 flex justify-end gap-2">
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
