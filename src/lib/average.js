import grade11Courses from '../data/grade11.json'

// The weight is optional: an assessment with no weight counts as much as the average weight of
// the marked ones that have one, so with no weights at all it is a plain mean.
const hasWeight = (a) => a.weight != null && a.weight !== ''

// Weighted course average (design.md 7.1). Only assessments with a usable mark count.
// Returns a percentage, or null if nothing has been entered yet.
export function courseAverage(assessments = []) {
  const marked = assessments.filter((a) => {
    // Number(null) and Number('') are 0, so an unmarked assessment must be skipped explicitly.
    if (a.mark == null || a.mark === '') return false
    return Number.isFinite(Number(a.mark)) && Number(a.outOf) > 0 && (!hasWeight(a) || Number(a.weight) > 0)
  })
  const weights = marked.filter(hasWeight).map((a) => Number(a.weight))
  const defaultWeight = weights.length ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 1

  let earned = 0
  let totalWeight = 0
  for (const a of marked) {
    const weight = hasWeight(a) ? Number(a.weight) : defaultWeight
    earned += (Number(a.mark) / Number(a.outOf)) * weight
    totalWeight += weight
  }
  return totalWeight > 0 ? (earned / totalWeight) * 100 : null
}

// The mark used everywhere else: the final mark if there is one, otherwise the running average.
export function courseMark(course) {
  if (course.finalMark != null && course.finalMark !== '') return Number(course.finalMark)
  return courseAverage(course.assessments)
}

// Plain mean of the marks that exist; null if there are none.
export function averageOf(marks) {
  const values = marks.filter((m) => m != null && Number.isFinite(m))
  return values.length ? values.reduce((sum, m) => sum + m, 0) / values.length : null
}

// Grade 11 courses that lead to a Grade 12 course, e.g. MCV4U ← MCR3U.
export function grade11PrerequisitesOf(code12) {
  return grade11Courses.filter((c) => c.leadsTo.includes(code12)).map((c) => c.code)
}

// How Grade 12 courses without a mark yet are counted. Chosen by the student on the profile page
// and saved as users/{uid}.estimateMode.
export const ESTIMATE_MODES = {
  grade11: 'Use the Grade 11 prerequisite mark',
  grade11Minus2: 'Use the Grade 11 prerequisite mark − 2',
  none: 'Leave them out',
}
export const DEFAULT_ESTIMATE_MODE = 'grade11'
// Grade 12 courses are harder, so the cautious estimate takes this much off.
export const GRADE12_PENALTY = 2

export function estimateMode(value) {
  return ESTIMATE_MODES[value] ? value : DEFAULT_ESTIMATE_MODE
}

// Estimate a Grade 12 mark from the matching Grade 11 course (design.md 7.2 step 4).
// grade11Marks: [{ code, mark }]. Returns { mark, from } or null (always null in 'none' mode).
export function estimateFromGrade11(code12, grade11Marks, mode = DEFAULT_ESTIMATE_MODE) {
  if (mode === 'none') return null
  const sources = new Set(grade11PrerequisitesOf(code12))
  let best = null
  for (const g of grade11Marks) {
    if (g.mark == null || g.mark === '') continue
    const mark = Number(g.mark)
    if (sources.has(g.code) && Number.isFinite(mark) && (best === null || mark > best.mark)) {
      best = { mark, from: g.code }
    }
  }
  if (best && mode === 'grade11Minus2') best.mark = Math.max(0, best.mark - GRADE12_PENALTY)
  return best
}

// "Estimated from MCR3U" / "Estimated from MCR3U − 2"
export function estimateSource(estimate, mode) {
  return mode === 'grade11Minus2' ? `${estimate.from} − ${GRADE12_PENALTY}` : estimate.from
}

export function formatMark(mark) {
  return mark == null ? '—' : `${Math.round(mark * 10) / 10}%`
}

// One entry per Grade 12 course: code → { mark, estimated, from }. Courses with no mark and no
// Grade 11 estimate are left out, since they can't count towards an average yet.
export function buildMarkTable(grade12, grade11Marks, mode = DEFAULT_ESTIMATE_MODE) {
  const table = new Map()
  for (const c of grade12) {
    const mark = courseMark(c)
    if (mark != null) {
      table.set(c.code, { mark, estimated: false, from: null })
      continue
    }
    const estimate = estimateFromGrade11(c.code, grade11Marks, mode)
    if (estimate) table.set(c.code, { mark: estimate.mark, estimated: true, from: estimate.from })
  }
  return table
}

export const TOP_N = 6

// The student picks which courses must be in their general top 6 (saved as users/{uid}.top6Pinned);
// the rest of the slots go to their highest marks. Almost every program requires Grade 12 English,
// so ENG4U is pinned by default. Older profiles saved lockEnglish: false to mean "pin nothing".
export const ENGLISH_CODE = 'ENG4U'
export const DEFAULT_PINNED = [ENGLISH_CODE]

export function pinnedCourses(profile) {
  if (Array.isArray(profile?.top6Pinned)) return profile.top6Pinned.filter((c) => typeof c === 'string').slice(0, TOP_N)
  if (profile?.lockEnglish === false) return []
  return DEFAULT_PINNED
}

// The general top-6 average (no specific program): pinned courses first, then the best of the rest.
export function topSixAverage(markTable, pinned = DEFAULT_PINNED) {
  return admissionAverage(pinned.length ? { prerequisites: { required: pinned } } : null, markTable)
}

// Admission average for one program (design.md 7.2): required courses first, then the best
// `count` courses of each "choose" group, then the highest remaining courses up to 6.
// Pass program = null for a general top-6 average. Returns null if no course has a mark.
export function admissionAverage(program, markTable) {
  const { required = [], choose = [] } = program?.prerequisites ?? {}
  const used = []
  const take = (code) => {
    if (used.length < TOP_N && markTable.has(code) && !used.includes(code)) used.push(code)
  }
  const byMark = (codes) => codes.filter((c) => markTable.has(c)).sort((a, b) => markTable.get(b).mark - markTable.get(a).mark)

  required.forEach(take)
  for (const group of choose) {
    byMark(group.courses.filter((c) => !used.includes(c)))
      .slice(0, group.count)
      .forEach(take)
  }
  byMark([...markTable.keys()]).forEach(take)

  if (used.length === 0) return null
  const courses = used.map((code) => ({ code, ...markTable.get(code) }))
  return {
    average: averageOf(courses.map((c) => c.mark)),
    courses,
    estimated: courses.some((c) => c.estimated),
    complete: courses.length === TOP_N,
  }
}
