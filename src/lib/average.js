import grade11Courses from '../data/grade11.json'

// Weighted course average (design.md 7.1). Only assessments with a usable mark count.
// Returns a percentage, or null if nothing has been entered yet.
export function courseAverage(assessments = []) {
  let earned = 0
  let totalWeight = 0
  for (const a of assessments) {
    // Number(null) and Number('') are 0, so an unmarked assessment must be skipped explicitly.
    if (a.mark == null || a.mark === '') continue
    const mark = Number(a.mark)
    const outOf = Number(a.outOf)
    const weight = Number(a.weight)
    if (!Number.isFinite(mark) || !(outOf > 0) || !(weight > 0)) continue
    earned += (mark / outOf) * weight
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

// Estimate a Grade 12 mark from the matching Grade 11 course (design.md 7.2 step 4).
// grade11Marks: [{ code, mark }]. Returns { mark, from } or null.
export function estimateFromGrade11(code12, grade11Marks) {
  const sources = new Set(grade11PrerequisitesOf(code12))
  let best = null
  for (const g of grade11Marks) {
    if (g.mark == null || g.mark === '') continue
    const mark = Number(g.mark)
    if (sources.has(g.code) && Number.isFinite(mark) && (best === null || mark > best.mark)) {
      best = { mark, from: g.code }
    }
  }
  return best
}

export function formatMark(mark) {
  return mark == null ? '—' : `${Math.round(mark * 10) / 10}%`
}

// One entry per Grade 12 course: code → { mark, estimated, from }. Courses with no mark and no
// Grade 11 estimate are left out, since they can't count towards an average yet.
export function buildMarkTable(grade12, grade11Marks) {
  const table = new Map()
  for (const c of grade12) {
    const mark = courseMark(c)
    if (mark != null) {
      table.set(c.code, { mark, estimated: false, from: null })
      continue
    }
    const estimate = estimateFromGrade11(c.code, grade11Marks)
    if (estimate) table.set(c.code, { mark: estimate.mark, estimated: true, from: estimate.from })
  }
  return table
}

export const TOP_N = 6

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
