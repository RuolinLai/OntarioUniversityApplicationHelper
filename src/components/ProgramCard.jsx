import { Link, useLocation } from 'react-router'
import { Briefcase, FileText, MapPin } from 'lucide-react'
import Badge from './Badge.jsx'
import RangeBar from './charts/RangeBar.jsx'
import HeartButton from './HeartButton.jsx'
import { CategoryBadge, EligibilityBadge } from './MatchBadges.jsx'
import { formatRange, formatPrerequisites, formatUniversity } from '../lib/format.js'
import { formatMark } from '../lib/average.js'
import { fromHere } from '../lib/backLink.js'

// assessment (optional, signed-in only): result of assessProgram() for this student.
export default function ProgramCard({ program, assessment }) {
  const location = useLocation()
  const { id, name, degree, field, admissionRange, coop, supplementary, prerequisites } = program

  return (
    // The title link stretches over the whole card (after:inset-0), so the heart can be a
    // separate button instead of a button nested inside a link.
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
            <Link to={`/programs/${id}`} state={fromHere(location)} className="after:absolute after:inset-0 after:rounded-2xl">
              {name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-start gap-1 text-sm text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {formatUniversity(program)}
              {degree && ` · ${degree}`}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <div className="text-right">
            <div className={`font-semibold ${admissionRange?.low != null ? 'text-lg text-slate-900' : 'text-sm text-slate-400'}`}>
              {formatRange(admissionRange)}
            </div>
            <div className="text-xs text-slate-500">admission avg</div>
          </div>
          <HeartButton programId={id} className="relative z-10 -mr-1.5 -mt-1" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {field.map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
        {coop && (
          <Badge tone="green" icon={Briefcase}>
            Co-op
          </Badge>
        )}
        {supplementary?.required && (
          <Badge tone="amber" icon={FileText}>
            Supplementary
          </Badge>
        )}
      </div>

      {admissionRange?.low != null && (
        <div className="mt-3">
          <RangeBar range={admissionRange} you={assessment?.admission?.average ?? null} />
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500">
        Requires: <span className="font-mono text-slate-700 [overflow-wrap:anywhere]">{formatPrerequisites(prerequisites)}</span>
      </div>

      {assessment && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <EligibilityBadge status={assessment.eligibility.status} />
          <CategoryBadge category={assessment.category} />
          {assessment.admission && (
            <span className="ml-auto">
              Your avg: <span className="font-semibold text-slate-900">{formatMark(assessment.admission.average)}</span>
              {assessment.admission.estimated && ' (est.)'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
