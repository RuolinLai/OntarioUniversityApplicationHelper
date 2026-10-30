import { useState } from 'react'
import { COURSE_STATUS, grade12Courses, groupBySubject } from '../lib/data.js'
import { inputClass, primaryButton, secondaryButton } from './form.js'

const groups = groupBySubject(grade12Courses)

// Tick Grade 12 U/M courses and set each one's status.
// existing: current grade12Courses docs. onSave receives { code: status }.
export default function Grade12Picker({ existing, onSave, saveLabel = 'Save', saving, onCancel }) {
  const [selection, setSelection] = useState(() => Object.fromEntries(existing.map((c) => [c.code, c.status ?? 'in_progress'])))

  function toggle(code) {
    setSelection((prev) => {
      const next = { ...prev }
      if (code in next) delete next[code]
      else next[code] = 'in_progress'
      return next
    })
  }

  const count = Object.keys(selection).length

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(selection)
      }}
    >
      <div className="space-y-6">
        {groups.map(([subject, list]) => (
          <fieldset key={subject}>
            <legend className="text-sm font-semibold text-slate-900">{subject}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {list.map((c) => {
                const checked = c.code in selection
                return (
                  <div
                    key={c.code}
                    className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                      checked ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggle(c.code)} className="accent-brand-700" />
                      <span className="font-mono text-xs text-slate-500">{c.code}</span>
                      <span className="truncate">{c.name}</span>
                    </label>
                    {checked && (
                      <select
                        value={selection[c.code]}
                        onChange={(e) => setSelection((prev) => ({ ...prev, [c.code]: e.target.value }))}
                        className={`${inputClass} w-auto py-1 text-xs`}
                        aria-label={`${c.code} status`}
                      >
                        {Object.entries(COURSE_STATUS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/95 py-4">
        <span className="text-sm text-slate-600">
          {count} {count === 1 ? 'course' : 'courses'} selected
          {count > 0 && count < 6 && ' · universities use your top 6'}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" className={secondaryButton} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
