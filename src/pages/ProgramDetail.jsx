import { Link, useLocation, useParams } from 'react-router'
import Badge from '../components/Badge.jsx'
import NotFound from './NotFound.jsx'
import { getProgram, courseName, allPrograms } from '../lib/data.js'
import { similarPrograms } from '../lib/search.js'
import { formatRange, formatUniversity, countWord } from '../lib/format.js'
import HeartButton from '../components/HeartButton.jsx'
import { CategoryBadge, EligibilityBadge } from '../components/MatchBadges.jsx'
import { assessProgram, CATEGORY_LABEL } from '../lib/recommend.js'
import { formatMark } from '../lib/average.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useStudent } from '../hooks/useStudent.js'
import { firebaseConfigured } from '../firebase.js'
import { backLink, fromHere } from '../lib/backLink.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

function Section({ title, children }) {
  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function CourseChip({ code, minimum }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="font-mono text-sm font-semibold text-slate-900">{code}</span>
      <span className="text-sm text-slate-600">{courseName(code)}</span>
      {minimum && <span className="ml-auto text-xs font-medium text-amber-700">min {minimum}%</span>}
    </li>
  )
}

function OfficialText({ children }) {
  if (!children) return null
  return (
    <blockquote className="mt-4 border-l-4 border-slate-200 pl-3 text-sm italic text-slate-500">
      <span className="not-italic font-medium text-slate-400">From the official site: </span>“{children}”
    </blockquote>
  )
}

export default function ProgramDetail() {
  const { id } = useParams()
  const location = useLocation()
  const program = getProgram(id)
  usePageTitle(program ? `${program.name} · ${program.university.shortName}` : 'Program not found')

  if (!program) return <NotFound />

  const { name, faculty, degree, field, description, admissionRange, prerequisites, supplementary, coop } = program
  const { required, choose, minimums = {} } = prerequisites
  const back = backLink(location.state)

  return (
    <div>
      <Link to={back.to} className="text-sm font-medium text-brand-700 hover:underline">
        ← Back{back.label && ` to ${back.label}`}
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700">{formatUniversity(program)}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{name}</h1>
          {(faculty || degree) && <p className="mt-1 text-slate-600">{[faculty, degree].filter(Boolean).join(' · ')}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {field.map((f) => (
              <Badge key={f}>{f}</Badge>
            ))}
            {coop && <Badge tone="green">Co-op available</Badge>}
            {supplementary.required && <Badge tone="amber">Supplementary required</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HeartButton programId={program.id} className="border border-slate-200 bg-white p-2" />
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-800"
          >
            Official website ↗
          </a>
        </div>
      </header>

      {program.needsReview && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some details on this page couldn&apos;t be read automatically from the official website. Please check the official
          site for the full requirements.
        </div>
      )}

      {description && <p className="mt-6 max-w-3xl text-slate-700">{description}</p>}

      <YourMatch program={program} />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Section title="Admission average">
          <div className={`font-bold ${admissionRange?.low != null ? 'text-3xl text-slate-900' : 'text-xl text-slate-400'}`}>
            {formatRange(admissionRange)}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {admissionRange?.low != null
              ? 'Based on recent years. Actual cut-offs change every year.'
              : 'This university does not publish an admission average for this program.'}
          </p>
          <OfficialText>{admissionRange?.rawText}</OfficialText>
        </Section>

        <div className="lg:col-span-2">
          <Section title="Required Grade 12 courses">
            {required.length === 0 && choose.length === 0 && (
              <p className="text-slate-600">No specific courses listed. See the official website for details.</p>
            )}
            {required.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {required.map((code) => (
                  <CourseChip key={code} code={code} minimum={minimums[code]} />
                ))}
              </ul>
            )}
            {choose.map((group, i) => (
              <div key={i} className="mt-4">
                <p className="text-sm font-medium text-slate-700">Plus {countWord(group.count)} of:</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.courses.map((code) => (
                    <CourseChip key={code} code={code} minimum={minimums[code]} />
                  ))}
                </ul>
              </div>
            ))}
            <OfficialText>{prerequisites.rawText}</OfficialText>
          </Section>
        </div>

        <div className="lg:col-span-3">
          <Section title="Supplementary application">
            {supplementary.required ? (
              <>
                <p className="font-medium text-slate-900">{supplementary.type}</p>
                <OfficialText>{supplementary.rawText}</OfficialText>
              </>
            ) : (
              <p className="text-slate-600">No supplementary application listed — admission is based on grades.</p>
            )}
          </Section>
        </div>
      </div>

      <Compare program={program} />

      <p className="mt-6 text-xs text-slate-500">
        {program.source === 'scraper' ? 'Last synced from official site' : 'Sample data, not yet verified'}: {program.lastSynced}.
        Always confirm on the{' '}
        <a href={program.officialUrl} target="_blank" rel="noreferrer" className="underline">
          official website
        </a>
        .
      </p>
    </div>
  )
}

// The same subject at other universities, so students can compare ranges and requirements.
function Compare({ program }) {
  const location = useLocation()
  const others = similarPrograms(program, allPrograms)
  if (others.length === 0) return null
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Compare at other universities</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {others.map((p) => (
          <li key={p.id}>
            <Link
              to={`/programs/${p.id}`}
              state={fromHere(location)}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{p.university.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[p.name, p.degree, p.campus].filter(Boolean).join(' · ')}
                  {p.supplementary?.required && ' · supplementary required'}
                </span>
              </span>
              <span className={`shrink-0 text-sm font-semibold ${p.admissionRange?.low != null ? 'text-slate-900' : 'text-slate-400'}`}>
                {formatRange(p.admissionRange)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <Link to="/login" state={{ from: `/programs/${program.id}` }} className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>{' '}
        to see whether you meet the prerequisites and how your average compares.
      </div>
    )
  }
  if (student.loading) return null

  const { eligibility, admission, category } = assessProgram(program, student.codes, student.markTable)
  const hasRange = program.admissionRange?.low != null

  return (
    <section className="mt-6 rounded-xl border border-brand-100 bg-brand-50/40 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your match</h2>
      <div className="mt-3 grid gap-5 sm:grid-cols-2">
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
                  : category
                    ? `${CATEGORY_LABEL[category]}: ${CATEGORY_HINT[category]}${
                        program.supplementary?.required ? ' Programs with a supplementary application are never marked Safety.' : ''
                      }`
                    : 'Your average is more than 5% below the bottom of the usual range.'}
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
