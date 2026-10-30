// "90–96%" / "90%+" / "Not published"
export function formatRange(range) {
  if (!range || range.low == null) return 'Not published'
  if (range.high == null || range.high === range.low) return `${range.low}%+`
  return `${range.low}–${range.high}%`
}

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four']

export function countWord(n) {
  return COUNT_WORDS[n] ?? String(n)
}

// Longer choice lists (some programs accept any of ~20 courses) are summarised on cards.
const MAX_LISTED = 5

// "ENG4U, MCV4U + two of SBI4U/SCH4U/SPH4U"
export function formatPrerequisites({ required, choose }) {
  const parts = []
  if (required.length) parts.push(required.join(', '))
  for (const group of choose) {
    const courses = group.courses.length > MAX_LISTED ? `${group.courses.length} courses` : group.courses.join('/')
    parts.push(`${countWord(group.count)} of ${courses}`)
  }
  return parts.join(' + ') || 'No specific courses'
}

// "University of Toronto · St. George"
export function formatUniversity(program) {
  return [program.university.name, program.campus].filter(Boolean).join(' · ')
}
