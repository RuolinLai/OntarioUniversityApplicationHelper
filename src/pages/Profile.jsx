import { useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Heart,
  History,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  UserRound,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { logOut, resetPassword, useAuth } from '../hooks/useAuth.jsx'
import { saveGrade11Marks, saveGrade12Selection, updateUserProfile, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import {
  averageOf,
  courseMark,
  ENGLISH_CODE,
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
import { daysBetween, formatDate, toDateString } from '../lib/calendar.js'
import ouacDates from '../data/dates.json'

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

      <div className="mt-5 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-slate-200)]" role="tablist">
        {Object.entries(TABS).map(([key, label]) => {
          const Icon = TAB_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setParams(key === 'courses' ? {} : { tab: key }, { replace: true })}
              className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-3 text-base font-medium ${
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
  const [showSettings, setShowSettings] = useState(false)
  const { saving, error, run } = useSaver()
  const student = useStudent()
  const mode = estimateMode(profile?.estimateMode)

  const top6 = student.topSix
  const top6Codes = new Set(top6?.courses.map((c) => c.code))
  const rows = grade12
    .map((c) => {
      const mark = courseMark(c)
      return { ...c, mark, estimate: mark == null ? estimateFromGrade11(c.code, grade11, mode) : null }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

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
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Top 6 average
              </p>
              <button
                type="button"
                aria-expanded={showSettings}
                aria-controls="average-settings"
                onClick={() => setShowSettings((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                {showSettings ? 'Hide settings' : 'How it’s calculated'}
                <ChevronDown className={`h-3.5 w-3.5 transition ${showSettings ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </div>
            {/* Collapsed: the score is the whole card, so it's bigger and centred vertically. */}
            <div className={showSettings ? '' : 'flex flex-1 flex-col justify-center py-4'}>
              <p className={`mt-1 font-bold tabular-nums ${showSettings ? 'text-5xl' : 'text-6xl sm:text-7xl'}`}>{formatMark(top6?.average)}</p>
              <p className={`mt-2 text-slate-300 ${showSettings ? 'text-sm' : 'text-base'}`}>
                {!top6
                  ? 'Add marks to see the average universities look at'
                  : `What universities look at · ${top6.courses.length} of ${TOP_N} courses${top6.estimated ? ', includes estimates' : ''}`}
              </p>
            </div>

            {showSettings && (
              <div id="average-settings" className="mt-5 space-y-4 border-t border-white/10 pt-4">
                <fieldset disabled={saving}>
                  <legend className="text-sm font-medium text-slate-200">Courses with no Grade 12 marks yet</legend>
                  <p className="mt-0.5 text-xs text-slate-400">Grade 12 is usually harder, so “− 2” is the cautious choice.</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {Object.entries(ESTIMATE_MODES).map(([value, label]) => (
                      <SettingOption
                        key={value}
                        name="estimateMode"
                        checked={mode === value}
                        onChange={() =>
                          run(() =>
                            updateUserProfile(user.uid, {
                              estimateMode: value,
                            }),
                          )
                        }
                      >
                        {label}
                      </SettingOption>
                    ))}
                  </div>
                </fieldset>

                <fieldset disabled={saving}>
                  <legend className="text-sm font-medium text-slate-200">Always count {ENGLISH_CODE} in the top 6?</legend>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Almost every program requires Grade 12 English, so it counts even if it isn&apos;t one of your best marks.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      [true, `Yes, always include ${ENGLISH_CODE}`],
                      [false, 'No, just take my best 6'],
                    ].map(([value, label]) => (
                      <SettingOption
                        key={label}
                        name="lockEnglish"
                        checked={student.lockEnglish === value}
                        onChange={() => run(() => updateUserProfile(user.uid, { lockEnglish: value }))}
                      >
                        {label}
                      </SettingOption>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          </div>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:content-start">
          <OuacCard />
          <Stat
            icon={History}
            tone="bg-violet-50 text-violet-600"
            label="Grade 11 average"
            value={formatMark(averageOf(grade11.map((g) => g.mark)))}
            hint={`${grade11.length} courses`}
          />
        </div>
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
    </div>
  )
}

// Countdown to the next OUAC date. These are the same for every Ontario applicant.
function OuacCard() {
  const today = toDateString(new Date())
  const next = ouacDates.filter((d) => d.date >= today).sort((x, y) => x.date.localeCompare(y.date))[0]
  const daysLeft = next ? daysBetween(today, next.date) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        </span>
        {next ? next.label : 'OUAC dates'}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">
        {!next ? '—' : daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {next ? `${formatDate(next.date)} · same for every Ontario applicant` : 'No upcoming OUAC dates'}
      </div>
    </div>
  )
}

// A radio styled as a pill, for the settings inside the dark Top 6 card.
function SettingOption({ name, checked, onChange, children }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        checked ? 'border-white/60 bg-white/15 font-medium text-white' : 'border-white/15 text-slate-300 hover:bg-white/5'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 accent-white" />
      {children}
    </label>
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
  const savedName = profile?.displayName ?? user.displayName ?? ''
  const [name, setName] = useState(savedName)
  const [message, setMessage] = useState('')
  const { saving, error, run } = useSaver()
  const usesPassword = user.providerData.some((p) => p.providerId === 'password')
  const usesGoogle = user.providerData.some((p) => p.providerId === 'google.com')
  const initials = (savedName || user.email || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const joined = user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' })
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px]" />
        <div className="relative flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full ring-4 ring-white/20" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-bold ring-4 ring-white/20">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold">{savedName || 'Your account'}</p>
            <p className="truncate text-sm text-white/80">{user.email}</p>
            {joined && <p className="mt-1 text-xs text-white/60">Member since {joined}</p>}
          </div>
        </div>
      </section>

      {(error || message) && (
        <p
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {!error && <Check className="h-4 w-4" aria-hidden="true" />}
          {error || message}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AccountHeading icon={UserRound} title="Personal info" hint="Your name appears on the dashboard and in the menu." />
        <form
          className="mt-4 space-y-4"
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
          <div className="text-sm font-medium text-slate-700">
            Email
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {user.email}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={primaryButton} disabled={saving || !name.trim() || name.trim() === savedName}>
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AccountHeading icon={ShieldCheck} title="Sign-in & security" />
        <ul className="mt-4 divide-y divide-slate-100">
          {usesGoogle && (
            <li className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Google</p>
                <p className="text-xs text-slate-500">You sign in with your Google account.</p>
              </div>
              <Badge tone="green">Connected</Badge>
            </li>
          )}
          {usesPassword && (
            <li className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Password</p>
                <p className="text-xs text-slate-500">We&apos;ll email you a link to set a new one.</p>
              </div>
              <button
                type="button"
                className={`${secondaryButton} flex items-center gap-2`}
                disabled={saving}
                onClick={async () => {
                  setMessage('')
                  if (await run(() => resetPassword(user.email))) setMessage(`Password reset email sent to ${user.email}.`)
                }}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Change password
              </button>
            </li>
          )}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-800">Log out</p>
          <p className="text-xs text-slate-500">Your courses and marks stay saved to your account.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          onClick={logOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </section>
    </div>
  )
}

function AccountHeading({ icon: Icon, title, hint }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
