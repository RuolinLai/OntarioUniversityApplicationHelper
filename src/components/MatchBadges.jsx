import Badge from './Badge.jsx'
import { ELIGIBILITY_LABEL } from '../lib/eligibility.js'
import { CATEGORY_LABEL } from '../lib/recommend.js'

const eligibilityTone = { eligible: 'green', missingOne: 'amber', notEligible: 'slate', unknown: 'slate' }
const eligibilityIcon = { eligible: '✓ ', missingOne: '⚠ ', notEligible: '✕ ', unknown: '' }

export function EligibilityBadge({ status }) {
  return (
    <Badge tone={eligibilityTone[status]}>
      {eligibilityIcon[status]}
      {status === 'unknown' ? 'Check requirements' : ELIGIBILITY_LABEL[status]}
    </Badge>
  )
}

const categoryStyle = {
  safety: 'bg-emerald-600 text-white',
  match: 'bg-sky-600 text-white',
  reach: 'bg-amber-500 text-white',
}

export function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryStyle[category]}`}>
      {CATEGORY_LABEL[category]}
    </span>
  )
}
