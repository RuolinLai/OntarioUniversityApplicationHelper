import { Link } from 'react-router'
import Badge from './Badge.jsx'
import { formatRange, formatPrerequisites, formatUniversity } from '../lib/format.js'

export default function ProgramCard({ program, fromSearch }) {
  const { id, name, degree, field, admissionRange, coop, supplementary, prerequisites } = program

  return (
    <Link
      to={`/programs/${id}`}
      state={{ fromSearch }}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{name}</h3>
          <p className="text-sm text-slate-500">
            {formatUniversity(program)}
            {degree && ` · ${degree}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-semibold ${admissionRange?.low != null ? 'text-lg text-slate-900' : 'text-sm text-slate-400'}`}>
            {formatRange(admissionRange)}
          </div>
          <div className="text-xs text-slate-500">admission avg</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {field.map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
        {coop && <Badge tone="green">Co-op</Badge>}
        {supplementary?.required && <Badge tone="amber">Supplementary required</Badge>}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Requires: <span className="font-mono text-slate-700">{formatPrerequisites(prerequisites)}</span>
      </div>
    </Link>
  )
}
