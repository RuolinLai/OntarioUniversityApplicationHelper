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

// "ENG4U, MCV4U + two of SBI4U/SCH4U/SPH4U"
export function formatPrerequisites({ required, choose }) {
  const parts = []
  if (required.length) parts.push(required.join(', '))
  for (const group of choose) parts.push(`${countWord(group.count)} of ${group.courses.join('/')}`)
  return parts.join(' + ') || 'No specific courses'
}

// "University of Toronto · St. George"
export function formatUniversity(program) {
  return [program.university.name, program.campus].filter(Boolean).join(' · ')
}
