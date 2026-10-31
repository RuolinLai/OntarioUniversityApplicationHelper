import { useState } from 'react'
import { BarChart3, BookOpen, ChevronRight, Heart, History, Pencil, Settings, SlidersHorizontal, Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { logOut, resetPassword, useAuth } from '../hooks/useAuth.jsx'
import { saveGrade11Marks, saveGrade12Selection, updateUserProfile, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import {
  admissionAverage,
  averageOf,
  courseMark,
  ESTIMATE_MODES,
  estimateFromGrade11,
  estimateMode,
  estimateSource,
  formatMark,
  TOP_N,
} from '../lib/average.js'
import { COURSE_STATUS, courseName, getProgram } from '../lib/data.js'
import { assessProgram } from '../lib/recommend.js'
import { useFavorites, setFavorite } from '../hooks/useFavorites.jsx'
import { useStudent } from '../hooks/useStudent.js'
import ProgramCard from '../components/ProgramCard.jsx'
import Badge from '../components/Badge.jsx'
import Grade12Picker from '../components/Grade12Picker.jsx'
import Grade11Editor from '../components/Grade11Editor.jsx'
import ExtracurricularsTab from '../components/ExtracurricularsTab.jsx'
import Spinner from '../components/Spinner.jsx'
import Stat from '../components/Stat.jsx'
import MarkBar from '../components/charts/MarkBar.jsx'
import { useSaver } from '../hooks/useSaver.js'
import { inputClass, primaryButton, secondaryButton } from '../components/form.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const TABS = {
  courses: 'Courses',
  grade11: 'Grade 11',
  extracurriculars: 'Extracurriculars',
  interested: 'Interested',
  account: 'Account',
}
const TAB_ICONS = { courses: BookOpen, grade11: History, extracurriculars: Trophy, interested: Heart, account: Settings }

const statusTone = { completed: 'green', in_progress: 'blue', next_semester: 'slate' }

export default function Profile() {
  usePageTitle('Profile')
  const [params, setParams] = useSearchParams()
  const tab = TABS[params.get('tab')] ? params.get('tab') : 'courses'
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()

  if (grade12.loading || grade11.loading) return <Spinner />

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Profile</h1>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {Object.entries(TABS).map(([key, label]) => {
          const Icon = TAB_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setParams(key === 'courses' ? {} : { tab: key }, { replace: true })}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-3 text-base font-medium ${
                tab === key ? 'border-brand-700 font-semibold text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === 'courses' && <CoursesTab grade12={grade12.items} grade11={grade11.items} />}
        {tab === 'grade11' && <Grade11Tab grade12={grade12.items} grade11={grade11.items} />}
        {tab === 'extracurriculars' && <ExtracurricularsTab />}
        {tab === 'interested' && <InterestedTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </div>
  )
}

function CoursesTab({ grade12, grade11 }) {
  const { user, profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const { saving, error, run } = useSaver()
  const student = useStudent()
  const mode = estimateMode(profile?.estimateMode)

  const top6 = admissionAverage(null, student.markTable)
  const top6Codes = new Set(top6?.courses.map((c) => c.code))
  const rows = grade12
    .map((c) => {
      const mark = courseMark(c)
      return { ...c, mark, estimate: mark == null ? estimateFromGrade11(c.code, grade11, mode) : null }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
  const withMarks = rows.filter((r) => r.mark != null)

  if (editing) {
    return (
      <>
        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
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
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Top 6 average
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums">{formatMark(top6?.average)}</p>
            <p className="mt-2 text-sm text-slate-300">
              {!top6
                ? 'Add marks to see the average universities look at'
                : `What universities look at · ${top6.courses.length} of ${TOP_N} courses${top6.estimated ? ', includes estimates' : ''}`}
            </p>
          </div>
        </section>
        <Stat
          icon={BarChart3}
          tone="bg-sky-50 text-sky-600"
          label="Grade 12 average"
          value={formatMark(averageOf(withMarks.map((r) => r.mark)))}
          hint={`${withMarks.length} of ${rows.length} courses have marks`}
        />
        <Stat
          icon={History}
          tone="bg-violet-50 text-violet-600"
          label="Grade 11 average"
          value={formatMark(averageOf(grade11.map((g) => g.mark)))}
          hint={`${grade11.length} courses`}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your Grade 12 courses</h2>
          <p className="text-sm text-slate-500">Open a course to log its tests and assignments.</p>
        </div>
        <button type="button" className={`${secondaryButton} inline-flex items-center gap-1.5`} onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Add / remove courses
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No courses yet. Click “Add / remove courses” to get started.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const count = r.assessments?.length ?? 0
            const hasFinal = r.finalMark != null && r.finalMark !== ''
            return (
              <li key={r.code}>
                <Link
                  to={`/profile/courses/${r.code}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700">{r.code}</span>
                    <Badge tone={statusTone[r.status]}>{COURSE_STATUS[r.status] ?? 'In progress'}</Badge>
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug text-slate-900">{courseName(r.code)}</h3>

                  <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-2">
                      {r.mark != null ? (
                        <span className="text-3xl font-bold tabular-nums text-slate-900">{formatMark(r.mark)}</span>
                      ) : r.estimate ? (
                        <span className="text-slate-500" title={`Estimated from your ${estimateSource(r.estimate, mode)} mark`}>
                          <span className="text-3xl font-bold tabular-nums text-slate-400">~{formatMark(r.estimate.mark)}</span>{' '}
                          <span className="text-sm">est. from {estimateSource(r.estimate, mode)}</span>
                        </span>
                      ) : (
                        <span className="text-lg font-medium text-slate-400">No marks yet</span>
                      )}
                      {top6Codes.has(r.code) && (
                        <span className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Trophy className="h-3 w-3" aria-hidden="true" />
                          Top 6
                        </span>
                      )}
                    </div>
                    <MarkBar mark={r.mark ?? r.estimate?.mark ?? null} estimated={r.mark == null} className="mt-2 h-2" />
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <span>{hasFinal ? 'Final mark entered' : count ? `${count} assessment${count === 1 ? '' : 's'}` : 'No assessments yet'}</span>
                      <span className="inline-flex items-center gap-0.5 font-medium text-brand-700 group-hover:underline">
                        {count || hasFinal ? 'Open' : 'Add marks'}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
          Courses with no Grade 12 marks yet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          How they count towards your averages and matches. Grade 12 is usually harder, so “− 2” is the cautious choice.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Courses with no Grade 12 marks yet">
          {Object.entries(ESTIMATE_MODES).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                mode === value ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="estimateMode"
                value={value}
                checked={mode === value}
                disabled={saving}
                onChange={() => run(() => updateUserProfile(user.uid, { estimateMode: value }))}
                className="mt-0.5 accent-brand-700"
              />
              {label}
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  )
}

function Grade11Tab({ grade12, grade11 }) {
  const { user, profile } = useAuth()
  const { saving, error, run } = useSaver()
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-5xl">
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-emerald-700">Saved.</p>}
      <Grade11Editor
        grade12Codes={grade12.map((c) => c.code)}
        existing={grade11}
        hidden={profile?.hiddenGrade11}
        saving={saving}
        onSave={async (marks, hidden) => {
          setSaved(false)
          setSaved(
            await run(() =>
              Promise.all([saveGrade11Marks(user.uid, grade11, marks), updateUserProfile(user.uid, { hiddenGrade11: hidden })]),
            ),
          )
        }}
      />
    </div>
  )
}

function InterestedTab() {
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
        No interested programs yet. Tap the heart on any program in{' '}
        <Link to="/programs" className="font-medium text-brand-700 hover:underline">
          Programs
        </Link>{' '}
        or{' '}
        <Link to="/for-you" className="font-medium text-brand-700 hover:underline">
          For You
        </Link>{' '}
        to add it here.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-600">
        {programs.length} interested program{programs.length === 1 ? '' : 's'}.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {programs.map((p) => (
          <ProgramCard key={p.id} program={p} assessment={assessProgram(p, student.codes, student.markTable)} />
        ))}
      </div>
      {gone.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {gone.length} interested program{gone.length === 1 ? ' is' : 's are'} no longer listed on the university website.{' '}
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

      {error && <p className="text-sm text-red-700">{error}</p>}
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
