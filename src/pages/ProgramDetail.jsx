import { Link, useLocation, useParams } from 'react-router'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  ExternalLink,
  FileText,
  FolderOpen,
  Info,
  LogIn,
  Mic,
  PenLine,
  Scale,
  Sparkles,
  Video,
} from 'lucide-react'
import Badge from '../components/Badge.jsx'
import NotFound from './NotFound.jsx'
import { getProgram, courseName, allPrograms } from '../lib/data.js'
import { similarPrograms } from '../lib/search.js'
import { formatRange, formatUniversity, countWord } from '../lib/format.js'
import HeartButton from '../components/HeartButton.jsx'
import RangeBar, { domainFor, MUTED_RANGE_COLOR, RANGE_COLOR, YOU_COLOR } from '../components/charts/RangeBar.jsx'
import { CategoryBadge, EligibilityBadge } from '../components/MatchBadges.jsx'
import { assessProgram, classify, CATEGORY_LABEL } from '../lib/recommend.js'
import { formatMark } from '../lib/average.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useStudent } from '../hooks/useStudent.js'
import { firebaseConfigured } from '../firebase.js'
import { backLink, fromHere } from '../lib/backLink.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { BackButton } from '../components/LinkButton.jsx'

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {children}
    </h2>
  )
}

function Section({ title, icon, children }) {
  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <div className="mt-4">{children}</div>
    </section>
  )
}

// has: true/false when we know the student's courses, null otherwise.
function CourseChip({ code, minimum, has = null }) {
  const style = has
    ? 'border-emerald-200 bg-emerald-50'
    : has === false
      ? 'border-dashed border-slate-300 bg-white'
      : 'border-slate-100 bg-slate-50'
  return (
    <li className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${style}`}>
      {has != null && (
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${has ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}
          title={has ? 'You take this course' : 'Not in your courses'}
        >
          {has && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="You take this course" />}
        </span>
      )}
      <span className="font-mono text-sm font-semibold text-slate-900">{code}</span>
      <span className="min-w-0 truncate text-sm text-slate-600">{courseName(code)}</span>
      {minimum && (
        <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">min {minimum}%</span>
      )}
    </li>
  )
}

// The text we parsed from, folded away so the page stays short.
function OfficialText({ children }) {
  if (!children) return null
  return (
    <details className="group mt-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Official wording
        <span className="transition group-open:rotate-90">›</span>
      </summary>
      <blockquote className="mt-2 border-l-4 border-slate-200 pl-3 italic text-slate-500">“{children}”</blockquote>
    </details>
  )
}

const SUPPLEMENTARY_ICONS = [
  [/interview|audition/i, Mic],
  [/portfolio/i, FolderOpen],
  [/video/i, Video],
  [/AIF|form|application|test/i, PenLine],
]

function SupplementaryList({ type }) {
  const parts = type.split(/\s*\+\s*/).filter(Boolean)
  return (
    <ul className="flex flex-wrap gap-2">
      {parts.map((part) => {
        const Icon = SUPPLEMENTARY_ICONS.find(([re]) => re.test(part))?.[1] ?? FileText
        return (
          <li key={part} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {part}
          </li>
        )
      })}
    </ul>
  )
}

export default function ProgramDetail() {
  const { id } = useParams()
  const location = useLocation()
  const program = getProgram(id)
  const student = useStudent()
  usePageTitle(program ? `${program.name} · ${program.university.shortName}` : 'Program not found')

  if (!program) return <NotFound />

  const { name, faculty, degree, field, description, admissionRange, prerequisites, supplementary, coop } = program
  const { required, choose, minimums = {} } = prerequisites
  const back = backLink(location.state)
  const knowsCourses = !student.loading && student.codes.length > 0
  const has = (code) => (knowsCourses ? student.codes.includes(code) : null)
  const you = knowsCourses ? (assessProgram(program, student.codes, student.markTable).admission?.average ?? null) : null
  const hasRange = admissionRange?.low != null

  return (
    <div>
      <BackButton to={back.to}>Back{back.label && ` to ${back.label}`}</BackButton>

      <header className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-200" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-700">{formatUniversity(program)}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{name}</h1>
            {(faculty || degree) && <p className="mt-1 text-slate-600">{[faculty, degree].filter(Boolean).join(' · ')}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {field.map((f) => (
                <Badge key={f}>{f}</Badge>
              ))}
              {coop && (
                <Badge tone="green" icon={Briefcase}>
                  Co-op available
                </Badge>
              )}
              {supplementary.required && (
                <Badge tone="amber" icon={FileText}>
                  Supplementary required
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <HeartButton programId={program.id} className="border border-slate-200 bg-white p-2" />
            <a
              href={program.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              Official website <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      {program.needsReview && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Some details couldn&apos;t be read automatically. Check the official site for the full requirements.
        </div>
      )}

      {description && description !== name && <p className="mt-5 max-w-3xl text-slate-700">{description}</p>}

      <YourMatch program={program} />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Section title="Admission average" icon={BarChart3}>
          <div className={`font-bold ${hasRange ? 'text-4xl text-slate-900' : 'text-xl text-slate-400'}`}>
            {formatRange(admissionRange)}
          </div>
          {hasRange ? (
            <>
              <RangeBar range={admissionRange} you={you} domain={domainFor([admissionRange], you)} size="md" />
              <p className="text-xs text-slate-500">From recent years — cut-offs change every year.</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Not published by the university.</p>
          )}
          <OfficialText>{admissionRange?.rawText}</OfficialText>
        </Section>

        <div className="lg:col-span-2">
          <Section title="Required Grade 12 courses" icon={BookOpen}>
            {required.length === 0 && choose.length === 0 && (
              <p className="text-slate-600">No specific courses listed. See the official website for details.</p>
            )}
            {required.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {required.map((code) => (
                  <CourseChip key={code} code={code} minimum={minimums[code]} has={has(code)} />
                ))}
              </ul>
            )}
            {choose.map((group, i) => (
              <div key={i} className="mt-4">
                <p className="text-sm font-medium text-slate-700">Plus {countWord(group.count)} of:</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.courses.map((code) => (
                    <CourseChip key={code} code={code} minimum={minimums[code]} has={has(code)} />
                  ))}
                </ul>
              </div>
            ))}
            <OfficialText>{prerequisites.rawText}</OfficialText>
          </Section>
        </div>

        <div className="lg:col-span-3">
          <Section title="Supplementary application" icon={FileText}>
            {supplementary.required ? (
              <>
                <SupplementaryList type={supplementary.type} />
                <OfficialText>{supplementary.rawText}</OfficialText>
              </>
            ) : (
              <p className="flex items-center gap-2 text-slate-600">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                None listed — admission is based on grades.
              </p>
            )}
          </Section>
        </div>
      </div>

      <Compare program={program} you={you} />

      <p className="mt-6 text-xs text-slate-500">
        {program.source === 'scraper' ? 'Last synced from official site' : 'Sample data, not yet verified'}: {program.lastSynced}. Always
        confirm on the{' '}
        <a href={program.officialUrl} target="_blank" rel="noreferrer" className="underline">
          official website
        </a>
        .
      </p>
    </div>
  )
}

// The same subject at other universities on one shared scale, so ranges compare at a glance.
// This program is blue and the others grey (the "emphasis" chart form); values are printed
// at the end of each row, so nothing depends on colour or hovering.
function Compare({ program, you }) {
  const location = useLocation()
  const others = similarPrograms(program, allPrograms)
  if (others.length === 0) return null
  const rows = [program, ...others]
  const domain = domainFor(
    rows.map((p) => p.admissionRange),
    you,
  )
  const grid = 'grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[10rem_1fr_6rem]'

  const body = (p, current) => (
    <>
      <span className="min-w-0">
        <span className={`block truncate text-sm ${current ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
          {current ? 'This program' : p.university.shortName}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {[p.degree, p.campus].filter(Boolean).join(' · ') || p.university.name}
        </span>
      </span>
      <span className="min-w-0">
        {p.admissionRange?.low != null ? (
          <RangeBar range={p.admissionRange} you={you} domain={domain} muted={!current} />
        ) : (
          <span className="text-xs text-slate-400">Not published</span>
        )}
      </span>
      <span className="flex items-center justify-end gap-1.5 text-sm font-semibold tabular-nums text-slate-900">
        {p.supplementary?.required && <FileText className="h-3.5 w-3.5 text-amber-600" aria-label="Supplementary required" />}
        {p.admissionRange?.low != null ? formatRange(p.admissionRange) : '—'}
      </span>
    </>
  )

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={Scale}>Compare at other universities</SectionTitle>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full" style={{ background: RANGE_COLOR }} /> This program
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full" style={{ background: MUTED_RANGE_COLOR }} /> Other universities
        </span>
        {you != null && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: YOU_COLOR }} /> Your average ({formatMark(you)})
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" /> Supplementary required
        </span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {rows.map((p, i) =>
          i === 0 ? (
            <li key={p.id} className={`${grid} bg-mint/40`}>
              {body(p, true)}
            </li>
          ) : (
            <li key={p.id}>
              <Link to={`/programs/${p.id}`} state={fromHere(location)} className={`${grid} hover:bg-slate-50`}>
                {body(p, false)}
              </Link>
            </li>
          ),
        )}
      </ul>
      <p className="mt-2 px-2 text-xs text-slate-400">
        Scale {domain[0]}–{domain[1]}%. A bar that fades out to the right is a minimum (e.g. &ldquo;80%+&rdquo;).
      </p>
    </section>
  )
}

const CATEGORY_HINT = {
  safety: 'Your average is more than 1% above the top of the usual range.',
  match: 'Your average is within 1% of the top of the usual range.',
  reach: 'Your average is below the top of the usual range.',
}

function describeMissing(item) {
  if (item.code) return `${item.code} ${courseName(item.code)}`
  return `${countWord(item.count)} more of ${item.courses.join(' / ')}`
}

// "How do I compare?" box: eligibility, the student's top-6 average for this program and a
// safety/match/reach label. Logged-out visitors get a prompt to log in instead.
function YourMatch({ program }) {
  const { user } = useAuth()
  const student = useStudent()
  if (!firebaseConfigured) return null

  if (!user) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <LogIn className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>
          <Link to="/login" state={{ from: `/programs/${program.id}` }} className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>{' '}
          to check your prerequisites and compare your average.
        </span>
      </div>
    )
  }
  if (student.loading) return null

  const { eligibility, admission, category } = assessProgram(program, student.codes, student.markTable)
  const hasRange = program.admissionRange?.low != null
  // A Safety-level average on a supplementary program is shown as Match; explain why.
  const cappedSafety =
    category === 'match' && program.supplementary?.required && classify(admission?.average, program.admissionRange) === 'safety'

  return (
    <section className="mt-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
      <SectionTitle icon={Sparkles}>Your match</SectionTitle>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {student.codes.length === 0 ? (
          <p className="text-sm text-slate-600">
            <Link to="/profile" className="font-medium text-brand-700 hover:underline">
              Add your Grade 12 courses
            </Link>{' '}
            to check prerequisites.
          </p>
        ) : (
          <div>
            <EligibilityBadge status={eligibility.status} />
            {eligibility.status === 'unknown' && (
              <p className="mt-2 text-sm text-slate-600">The requirements couldn&apos;t be read reliably — check the official site.</p>
            )}
            {eligibility.status === 'eligible' && <p className="mt-2 text-sm text-slate-600">You take every required course.</p>}
            {eligibility.missing.length > 0 && eligibility.status !== 'unknown' && (
              <div className="mt-2 text-sm text-slate-700">
                You&apos;re missing:
                <ul className="mt-1 list-inside list-disc">
                  {eligibility.missing.map((m, i) => (
                    <li key={i}>{describeMissing(m)}</li>
                  ))}
                </ul>
              </div>
            )}
            {eligibility.belowMinimum.map((b) => (
              <p key={b.code} className="mt-2 text-sm text-amber-800">
                Your {b.code} mark ({formatMark(b.mark)}) is below the {b.minimum}% minimum.
              </p>
            ))}
          </div>
        )}

        <div>
          {admission ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">{formatMark(admission.average)}</span>
                <CategoryBadge category={category} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Your top {admission.courses.length} average for this program
                {admission.estimated && ' (estimated — some marks come from Grade 11)'}.
                {!admission.complete && ' Fewer than 6 courses have marks yet.'}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {admission.courses.map((c) => `${c.code} ${Math.round(c.mark)}${c.estimated ? '*' : ''}`).join(' · ')}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {!hasRange
                  ? 'No published admission range, so this program can’t be labelled safety, match or reach.'
                  : cappedSafety
                    ? `${CATEGORY_LABEL.match}: ${CATEGORY_HINT.safety} Programs with a supplementary application are never marked Safety, because grades are only part of the decision.`
                  : category
                    ? `${CATEGORY_LABEL[category]}: ${CATEGORY_HINT[category]}`
                    :'Your average is more than 5% below the bottom of the usual range.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Add marks to your courses to compare your average.</p>
          )}
        </div>
      </div>
    </section>
  )
}
