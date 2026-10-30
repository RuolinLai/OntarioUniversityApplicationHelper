import programs from '../data/programs.json'
import universities from '../data/universities.json'
import courses from '../data/courses.json'

const universityById = new Map(universities.map((u) => [u.id, u]))
const courseByCode = new Map(courses.map((c) => [c.code, c]))

// Attach the university object to each program so pages don't have to look it up.
export const allPrograms = programs.map((p) => ({
  ...p,
  university: universityById.get(p.universityId),
}))

export const allUniversities = universities

export const allFields = [...new Set(programs.flatMap((p) => p.field))].sort()

export function getProgram(id) {
  return allPrograms.find((p) => p.id === id)
}

export function courseName(code) {
  return courseByCode.get(code)?.name ?? code
}
