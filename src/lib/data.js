import programs from '../data/programs.json'
import universities from '../data/universities.json'
import courses from '../data/courses.json'
import grade11 from '../data/grade11.json'
import specialRequirements from '../data/special-requirements.json'

const universityById = new Map(universities.map((u) => [u.id, u]))
const courseByCode = new Map([...courses, ...grade11].map((c) => [c.code, c]))

// Hand-checked extras (interviews, videos, AIF deadlines…) for the programs listed in
// special-requirements.json. Several entries can apply to one program; they are combined.
export function mergeSpecial(program, entries) {
  const matches = entries.filter((e) => e.programs.includes(program.id))
  if (matches.length === 0) return { ...program, special: null }
  const special = {
    items: matches.flatMap((e) => e.items ?? []),
    notes: matches.flatMap((e) => e.notes ?? []),
    // url "@program" stands for the program's own page, for entries shared by several programs.
    sources: [
      ...new Map(
        matches
          .flatMap((e) => e.sources ?? [])
          .map((s) => (s.url === '@program' ? { ...s, url: program.officialUrl } : s))
          .map((s) => [s.url, s]),
      ).values(),
    ],
    checked: matches
      .map((e) => e.checked)
      .sort()
      .at(-1),
  }
  // Scraped dates win; curated ones are added when that day isn't already listed.
  const keyDates = [...(program.keyDates ?? [])]
  for (const d of matches.flatMap((e) => e.dates ?? [])) {
    if (!keyDates.some((k) => k.date === d.date)) keyDates.push(d)
  }
  keyDates.sort((a, b) => a.date.localeCompare(b.date))
  // Some sites (e.g. Waterloo Engineering) don't mention the forms where the scraper looks.
  const type = matches.find((e) => e.supplementaryType)?.supplementaryType
  // Entries with only notes (e.g. "send extra documents if your average is below 80%") don't
  // make the program a supplementary one.
  const supplementary =
    program.supplementary.required || (special.items.length === 0 && !type)
      ? program.supplementary
      : {
          ...program.supplementary,
          required: true,
          type: type ?? special.items.map((i) => i.label).join(' + '),
        }
  return { ...program, supplementary, keyDates, special }
}

// Attach the university object to each program so pages don't have to look it up.
export const allPrograms = programs.map((p) => ({
  ...mergeSpecial(p, specialRequirements.entries),
  university: universityById.get(p.universityId),
}))

// universities.json lists every Ontario university; only show the ones we have programs for.
export const allUniversities = universities
  .filter((u) => programs.some((p) => p.universityId === u.id))
  .sort((a, b) => a.name.localeCompare(b.name))

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
  ['ID', 'Interdisciplinary Studies'],
  ['I', 'Computer Studies & Technology'],
  ['T', 'Computer Studies & Technology'],
  ['C', 'Canadian & World Studies'],
  ['H', 'Social Sciences & Humanities'],
  ['P', 'Health & Physical Education'],
  ['B', 'Business'],
  ['A', 'Arts'],
  ['F', 'French'],
  ['L', 'International Languages'],
  ['N', 'First Nations, Métis & Inuit Studies'],
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
