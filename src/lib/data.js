import programs from '../data/programs.json'
import universities from '../data/universities.json'
import courses from '../data/courses.json'
import grade11 from '../data/grade11.json'

const universityById = new Map(universities.map((u) => [u.id, u]))
const courseByCode = new Map([...courses, ...grade11].map((c) => [c.code, c]))

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

export const grade12Courses = courses
export const grade11Courses = grade11

export const COURSE_STATUS = {
  completed: 'Completed',
  in_progress: 'In progress',
  next_semester: 'Next semester',
}

// Subject groups for course pickers, based on the first letter of the course code.
const SUBJECTS = [
  ['E', 'English'],
  ['M', 'Math'],
  ['S', 'Science'],
  ['I', 'Computer Studies & Technology'],
  ['T', 'Computer Studies & Technology'],
  ['C', 'Canadian & World Studies'],
  ['H', 'Social Sciences & Humanities'],
  ['P', 'Health & Physical Education'],
  ['B', 'Business'],
  ['A', 'Arts'],
  ['F', 'French'],
]

export function groupBySubject(list) {
  const groups = new Map()
  for (const c of list) {
    const subject = SUBJECTS.find(([letter]) => c.code.startsWith(letter))?.[1] ?? 'Other'
    if (!groups.has(subject)) groups.set(subject, [])
    groups.get(subject).push(c)
  }
  return [...groups]
}
