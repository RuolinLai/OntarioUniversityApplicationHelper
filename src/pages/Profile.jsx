import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { logOut, resetPassword, useAuth } from '../hooks/useAuth.jsx'
import { saveGrade11Marks, saveGrade12Selection, updateUserProfile, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import { averageOf, courseMark, estimateFromGrade11, formatMark } from '../lib/average.js'
import { COURSE_STATUS, courseName, getProgram } from '../lib/data.js'
import { assessProgram } from '../lib/recommend.js'
import { useFavorites, setFavorite } from '../hooks/useFavorites.jsx'
import { useStudent } from '../hooks/useStudent.js'
import ProgramCard from '../components/ProgramCard.jsx'
import Badge from '../components/Badge.jsx'
import Grade12Picker from '../components/Grade12Picker.jsx'
import Grade11Editor from '../components/Grade11Editor.jsx'
import Spinner from '../components/Spinner.jsx'
import { inputClass, primaryButton, secondaryButton } from '../components/form.js'

const TABS = {
  courses: 'Courses',
  grade11: 'Grade 11',
  extracurriculars: 'Extracurriculars',
  favourites: 'Favourites',
  account: 'Account',
}

const statusTone = { completed: 'green', in_progress: 'blue', next_semester: 'slate' }

export default function Profile() {
  const [params, setParams] = useSearchParams()
  const tab = TABS[params.get('tab')] ? params.get('tab') : 'courses'
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()

  if (grade12.loading || grade11.loading) return <Spinner />

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {Object.entries(TABS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'courses' ? {} : { tab: key }, { replace: true })}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'courses' && <CoursesTab grade12={grade12.items} grade11={grade11.items} />}
        {tab === 'grade11' && <Grade11Tab grade12={grade12.items} grade11={grade11.items} />}
        {tab === 'extracurriculars' && <Later text="Clubs, sports, jobs, volunteering and awards will go here." />}
        {tab === 'favourites' && <FavouritesTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </div>
  )
}

function useSaver() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function run(action) {
    setError('')
    setSaving(true)
    try {
      await action()
      return true
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
      return false
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, run }
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

function CoursesTab({ grade12, grade11 }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const { saving, error, run } = useSaver()

  const rows = grade12
    .map((c) => {
      const mark = courseMark(c)
      return { ...c, mark, estimate: mark == null ? estimateFromGrade11(c.code, grade11) : null }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
  const withMarks = rows.filter((r) => r.mark != null)

  if (editing) {
    return (
      <>
        {error && <p className="mb-4 text-sm text-brand-700">{error}</p>}
        <Grade12Picker
          existing={grade12}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={async (selection) => {
            if (await run(() => saveGrade12Selection(user.uid, grade12, selection))) setEditing(false)
          }}
        />
      </>
    )
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Grade 12 average" value={formatMark(averageOf(withMarks.map((r) => r.mark)))} hint={`${withMarks.length} of ${rows.length} courses have marks`} />
        <Stat label="Grade 11 average" value={formatMark(averageOf(grade11.map((g) => g.mark)))} hint={`${grade11.length} courses`} />
        <Stat label="Grade 12 courses" value={rows.length} hint="Admission averages use your top 6" />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Grade 12 courses</h2>
        <button type="button" className={secondaryButton} onClick={() => setEditing(true)}>
          Add / remove courses
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No courses yet. Click “Add / remove courses” to get started.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((r) => (
            <li key={r.code}>
              <Link to={`/profile/courses/${r.code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="w-14 font-mono text-xs text-slate-500">{r.code}</span>
                <span className="flex-1 text-sm font-medium text-slate-900">{courseName(r.code)}</span>
                <Badge tone={statusTone[r.status]}>{COURSE_STATUS[r.status] ?? 'In progress'}</Badge>
                <span className="w-28 text-right text-sm">
                  {r.mark != null ? (
                    <span className="font-semibold text-slate-900">{formatMark(r.mark)}</span>
                  ) : r.estimate ? (
                    <span className="text-slate-400" title={`Estimated from your ${r.estimate.from} mark`}>
                      ~{formatMark(r.estimate.mark)} est.
                    </span>
                  ) : (
                    <span className="text-slate-400">No marks</span>
                  )}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Click a course to log tests and assignments. A course&apos;s mark is its final mark if you entered one, otherwise the
        weighted average of its assessments. Estimates come from the matching Grade 11 course.
      </p>
    </div>
  )
}

function Grade11Tab({ grade12, grade11 }) {
  const { user } = useAuth()
  const { saving, error, run } = useSaver()
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-3xl">
      {error && <p className="mb-4 text-sm text-brand-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-emerald-700">Saved.</p>}
      <Grade11Editor
        grade12Codes={grade12.map((c) => c.code)}
        existing={grade11}
        saving={saving}
        onSave={async (marks) => {
          setSaved(false)
          setSaved(await run(() => saveGrade11Marks(user.uid, grade11, marks)))
        }}
      />
    </div>
  )
}

function FavouritesTab() {
  const { user } = useAuth()
  const favorites = useFavorites()
  const student = useStudent()
  if (favorites.loading || student.loading) return <Spinner />

  // Newest first. Firestore fills in addedAt a moment after a heart is clicked, so it can be null.
  const sorted = [...favorites.items].sort((a, b) => (b.addedAt?.toMillis?.() ?? Infinity) - (a.addedAt?.toMillis?.() ?? Infinity))
  const programs = sorted.map((f) => getProgram(f.id)).filter(Boolean)
  // A program can disappear if a university removes it from its website.
  const gone = sorted.filter((f) => !getProgram(f.id))

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No favourites yet. Tap the heart on any program in{' '}
        <Link to="/programs" className="font-medium text-brand-700 hover:underline">
          Programs
        </Link>{' '}
        or{' '}
        <Link to="/for-you" className="font-medium text-brand-700 hover:underline">
          For You
        </Link>{' '}
        to save it here.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-600">
        {programs.length} saved program{programs.length === 1 ? '' : 's'}.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {programs.map((p) => (
          <ProgramCard key={p.id} program={p} assessment={assessProgram(p, student.codes, student.markTable)} />
        ))}
      </div>
      {gone.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {gone.length} saved program{gone.length === 1 ? ' is' : 's are'} no longer listed on the university website.{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => Promise.all(gone.map((f) => setFavorite(user.uid, f.id, false))).catch(() => {})}
          >
            Remove {gone.length === 1 ? 'it' : 'them'}
          </button>
        </div>
      )}
    </div>
  )
}

function AccountTab() {
  const { user, profile } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? user.displayName ?? '')
  const [message, setMessage] = useState('')
  const { saving, error, run } = useSaver()
  const usesPassword = user.providerData.some((p) => p.providerId === 'password')

  return (
    <div className="max-w-md space-y-6">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setMessage('')
          if (await run(() => updateUserProfile(user.uid, { displayName: name.trim() }))) setMessage('Name saved.')
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input className={`${inputClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="text-sm text-slate-700">
          <span className="font-medium">Email</span>
          <div className="mt-1 text-slate-600">{user.email}</div>
        </div>
        <button type="submit" className={primaryButton} disabled={saving}>
          Save
        </button>
      </form>

      {error && <p className="text-sm text-brand-700">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-6">
        {usesPassword && (
          <button
            type="button"
            className={secondaryButton}
            onClick={async () => {
              setMessage('')
              if (await run(() => resetPassword(user.email))) setMessage(`Password reset email sent to ${user.email}.`)
            }}
          >
            Change password
          </button>
        )}
        <button type="button" className={secondaryButton} onClick={logOut}>
          Log out
        </button>
      </div>
    </div>
  )
}

function Later({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {text}
      <div className="mt-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Coming soon</span>
      </div>
    </div>
  )
}
