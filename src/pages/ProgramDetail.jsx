import { Link, useLocation, useParams } from 'react-router'
import Badge from '../components/Badge.jsx'
import NotFound from './NotFound.jsx'
import { getProgram, courseName } from '../lib/data.js'
import { formatRange, formatUniversity, countWord } from '../lib/format.js'

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

  if (!program) return <NotFound />

  const { name, faculty, degree, field, description, admissionRange, prerequisites, supplementary, coop } = program
  const { required, choose, minimums = {} } = prerequisites
  const backTo = location.state?.fromSearch ? `/programs?${location.state.fromSearch}` : '/programs'

  return (
    <div>
      <Link to={backTo} className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to programs
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
        <a
          href={program.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-800"
        >
          Official website ↗
        </a>
      </header>

      {program.needsReview && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some details on this page couldn&apos;t be read automatically from the official website. Please check the official
          site for the full requirements.
        </div>
      )}

      {description && <p className="mt-6 max-w-3xl text-slate-700">{description}</p>}

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
