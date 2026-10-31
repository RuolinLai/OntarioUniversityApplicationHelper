import { CircleCheck, CircleHelp, CircleX, ShieldCheck, Target, TrendingUp, TriangleAlert } from 'lucide-react'
import Badge from './Badge.jsx'
import { ELIGIBILITY_LABEL } from '../lib/eligibility.js'
import { CATEGORY_LABEL } from '../lib/recommend.js'

const eligibilityTone = { eligible: 'green', missingOne: 'amber', notEligible: 'slate', unknown: 'slate' }
const eligibilityIcon = { eligible: CircleCheck, missingOne: TriangleAlert, notEligible: CircleX, unknown: CircleHelp }

export function EligibilityBadge({ status }) {
  return (
    <Badge tone={eligibilityTone[status]} icon={eligibilityIcon[status]}>
      {status === 'unknown' ? 'Check requirements' : ELIGIBILITY_LABEL[status]}
    </Badge>
  )
}

export const CATEGORY_ICON = { safety: ShieldCheck, match: Target, reach: TrendingUp }

const categoryStyle = {
  safety: 'bg-emerald-600 text-white',
  match: 'bg-sky-600 text-white',
  reach: 'bg-amber-500 text-white',
}

export function CategoryBadge({ category }) {
  if (!category) return null
  const Icon = CATEGORY_ICON[category]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryStyle[category]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CATEGORY_LABEL[category]}
    </span>
  )
}
