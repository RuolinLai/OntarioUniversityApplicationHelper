import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { deleteUserItem, saveUserItem, useExtracurriculars } from '../hooks/useUserData.js'
import { useSaver } from '../hooks/useSaver.js'
import Modal from './Modal.jsx'
import Spinner from './Spinner.jsx'
import { inputClass, primaryButton, secondaryButton } from './form.js'

// Same categories that supplementary forms like Waterloo's AIF tend to ask about.
export const EC_CATEGORIES = [
  'Arts',
  'Sports',
  'Community Involvement',
  'Clubs',
  'Student Government',
  'Employment',
  'Awards',
  'Academic Enrichment Program',
]

const EMPTY = { category: EC_CATEGORIES[0], title: '', description: '', role: '', startDate: '', endDate: '', hoursPerWeek: '' }

// "Sep 2024 – Present"
function formatMonth(text) {
  const [y, m] = text.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
}

export function formatPeriod({ startDate, endDate }) {
  if (!startDate && !endDate) return ''
  if (!endDate) return `${formatMonth(startDate)} – Present`
  if (!startDate) return `Until ${formatMonth(endDate)}`
  return `${formatMonth(startDate)} – ${formatMonth(endDate)}`
}

export default function ExtracurricularsTab() {
  const { items, loading } = useExtracurriculars()
  // null = closed, {} = new, otherwise the activity being edited.
  const [editing, setEditing] = useState(null)

  if (loading) return <Spinner />

  const groups = EC_CATEGORIES.map((category) => [category, items.filter((a) => a.category === category)]).filter(([, list]) => list.length)
  // Anything saved with a category we no longer list still needs to be visible.
  const other = items.filter((a) => !EC_CATEGORIES.includes(a.category))
  if (other.length) groups.push(['Other', other])
  const totalHours = items.reduce((sum, a) => sum + (Number(a.hoursPerWeek) || 0), 0)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {items.length === 0
            ? 'Keep track of what you do outside class — it makes supplementary applications much easier to write.'
            : `${items.length} activit${items.length === 1 ? 'y' : 'ies'}${totalHours ? ` · about ${Math.round(totalHours * 10) / 10} hours a week` : ''}`}
        </p>
        <button type="button" className={primaryButton} onClick={() => setEditing({})}>
          + Add activity
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No activities yet. Clubs, sports, jobs, volunteering and awards all count.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map(([category, list]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{category}</h2>
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {list.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="h-full w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{a.title}</div>
                      {(a.role || formatPeriod(a)) && (
                        <div className="mt-0.5 text-sm text-slate-600">{[a.role, formatPeriod(a)].filter(Boolean).join(' · ')}</div>
                      )}
                      {a.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{a.description}</p>}
                      {a.hoursPerWeek ? <div className="mt-2 text-xs text-slate-500">{a.hoursPerWeek} h/week</div> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && <ActivityDialog key={editing.id ?? 'new'} activity={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ActivityDialog({ activity, onClose }) {
  const { user } = useAuth()
  // Saved activities store blanks as null; the inputs need strings.
  const [form, setForm] = useState(() => Object.fromEntries(Object.entries(EMPTY).map(([key, blank]) => [key, activity[key] ?? blank])))
  const [problem, setProblem] = useState('')
  const { saving, error, run } = useSaver()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const hours = form.hoursPerWeek === '' ? null : Number(form.hoursPerWeek)
    if (!form.title.trim()) return setProblem('Give the activity a name.')
    if (hours !== null && !(hours >= 0 && hours <= 168)) return setProblem('Hours per week should be between 0 and 168.')
    if (form.startDate && form.endDate && form.endDate < form.startDate) return setProblem('The end can’t be before the start.')
    setProblem('')
    const data = {
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      role: form.role.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      hoursPerWeek: hours,
    }
    if (await run(() => saveUserItem(user.uid, 'extracurriculars', activity.id, data))) onClose()
  }

  async function onDelete() {
    if (!window.confirm(`Delete “${activity.title}”?`)) return
    if (await run(() => deleteUserItem(user.uid, 'extracurriculars', activity.id))) onClose()
  }

  return (
    <Modal title={activity.id ? 'Edit activity' : 'New activity'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select className={`${inputClass} mt-1`} value={form.category} onChange={set('category')}>
            {EC_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {!EC_CATEGORIES.includes(form.category) && <option>{form.category}</option>}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input className={`${inputClass} mt-1`} value={form.title} onChange={set('title')} placeholder="e.g. Robotics Club" autoFocus />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Role <span className="font-normal text-slate-400">(optional)</span>
          <input className={`${inputClass} mt-1`} value={form.role} onChange={set('role')} placeholder="e.g. Team captain" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Started
            <input type="month" className={`${inputClass} mt-1`} value={form.startDate} onChange={set('startDate')} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ended <span className="font-normal text-slate-400">(blank = ongoing)</span>
            <input type="month" className={`${inputClass} mt-1`} value={form.endDate} min={form.startDate || undefined} onChange={set('endDate')} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Hours per week <span className="font-normal text-slate-400">(optional)</span>
          <input type="number" min="0" max="168" step="0.5" className={`${inputClass} mt-1`} value={form.hoursPerWeek} onChange={set('hoursPerWeek')} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          What you did <span className="font-normal text-slate-400">(optional)</span>
          <textarea className={`${inputClass} mt-1`} rows={4} value={form.description} onChange={set('description')} />
        </label>

        {(problem || error) && <p className="text-sm text-red-700">{problem || error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className={primaryButton} disabled={saving}>
            {activity.id ? 'Save' : 'Add activity'}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          {activity.id && (
            <button type="button" className="ml-auto text-sm font-medium text-brand-700 hover:underline" onClick={onDelete} disabled={saving}>
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
