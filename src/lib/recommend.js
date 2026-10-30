import { admissionAverage } from './average.js'
import { checkEligibility } from './eligibility.js'

// Thresholds for design.md 7.4, in percentage points. Categories are measured against the top
// of the range, since being merely inside a range like "low to mid-90s" is not a safe bet.
export const MATCH_MARGIN = 1 // match: high − 1 ≤ avg ≤ high + 1; safety: avg > high + 1
export const REACH_GAP = 5 // reach: low − 5 ≤ avg < high − 1

export const CATEGORY_LABEL = { safety: 'Safety', match: 'Match', reach: 'Reach' }

// 'safety' | 'match' | 'reach' | null (too far below, or no published range).
export function classify(average, range, hasSupplementary = false) {
  if (average == null || range?.low == null) return null
  const high = range.high ?? range.low
  let category = null
  if (average > high + MATCH_MARGIN) category = 'safety'
  else if (average >= high - MATCH_MARGIN) category = 'match'
  else if (average >= range.low - REACH_GAP) category = 'reach'
  // Interviews and supplementary forms make grades only part of the decision.
  if (category === 'safety' && hasSupplementary) category = 'match'
  return category
}

// Eligibility, admission average and category for one program.
export function assessProgram(program, userCodes, markTable) {
  const eligibility = checkEligibility(program, userCodes, markTable)
  const admission = admissionAverage(program, markTable)
  const category = classify(admission?.average, program.admissionRange, program.supplementary?.required)
  return { program, eligibility, admission, category }
}

// Key courses for each field (design.md 7.5).
export const FIELD_KEY_COURSES = {
  Engineering: ['MCV4U', 'MHF4U', 'SPH4U', 'SCH4U'],
  'Computer Science / Math': ['MCV4U', 'MHF4U', 'MDM4U', 'ICS4U'],
  'Life Sciences / Health': ['SBI4U', 'SCH4U', 'MHF4U'],
  'Physical Sciences / Environment': ['SCH4U', 'SPH4U', 'SES4U', 'MCV4U'],
  'Business / Commerce': ['MHF4U', 'MCV4U', 'MDM4U', 'BBB4M', 'BAT4M'],
  'Social Sciences / Humanities': ['ENG4U', 'CHY4U', 'CGW4U', 'HSB4U'],
  'Arts / Design': ['AVI4M', 'AMU4M', 'ADA4M'],
}

// Top fields for this course mix. Score = share of the field's key courses the student takes;
// ties go to the field where those courses have the higher average mark.
export function recommendFields(userCodes, markTable = new Map(), limit = 3) {
  const has = new Set(userCodes)
  return Object.entries(FIELD_KEY_COURSES)
    .map(([field, keys]) => {
      const matched = keys.filter((c) => has.has(c))
      const marks = matched.filter((c) => markTable.has(c)).map((c) => markTable.get(c).mark)
      return {
        field,
        matched,
        missing: keys.filter((c) => !has.has(c)),
        score: matched.length / keys.length,
        markAverage: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
      }
    })
    .filter((f) => f.matched.length > 0)
    .sort((a, b) => b.score - a.score || b.markAverage - a.markAverage)
    .slice(0, limit)
}
