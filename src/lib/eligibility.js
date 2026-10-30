// Prerequisite check (design.md 7.3). userCodes: every Grade 12 course the student has taken,
// is taking or plans to take — they will all be done by the time offers are made.
//
// Returns { status, missing, belowMinimum }:
//   status: 'eligible' | 'missingOne' | 'notEligible' | 'unknown' (requirements couldn't be read)
//   missing: [{ code }] for required courses, [{ count, courses }] for short "choose" groups
//   belowMinimum: [{ code, minimum, mark }] — courses taken but marked under the program minimum
export function checkEligibility(program, userCodes, markTable = new Map()) {
  const { required = [], choose = [], minimums = {} } = program.prerequisites ?? {}
  const has = new Set(userCodes)

  const missing = required.filter((code) => !has.has(code)).map((code) => ({ code }))
  let missingCount = missing.length
  for (const group of choose) {
    // A course already counted as required can't also fill a choose group.
    const hits = group.courses.filter((c) => has.has(c) && !required.includes(c)).length
    const short = group.count - hits
    if (short > 0) {
      const options = group.courses.filter((c) => !has.has(c))
      missing.push({ count: short, courses: options })
      missingCount += short
    }
  }

  const belowMinimum = Object.entries(minimums)
    .filter(([code, minimum]) => markTable.has(code) && markTable.get(code).mark < minimum)
    .map(([code, minimum]) => ({ code, minimum, mark: markTable.get(code).mark }))

  let status = missingCount === 0 ? 'eligible' : missingCount === 1 ? 'missingOne' : 'notEligible'
  if (program.needsReview) status = 'unknown'
  return { status, missing, missingCount, belowMinimum }
}

export const ELIGIBILITY_LABEL = {
  eligible: 'Eligible',
  missingOne: 'Missing 1 course',
  notEligible: 'Not eligible',
  unknown: 'Check requirements on official site',
}
