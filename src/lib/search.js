export const SORT_OPTIONS = {
  name: 'Name (A–Z)',
  avgHigh: 'Admission average (high → low)',
  avgLow: 'Admission average (low → high)',
}

// Common short forms students type.
const ABBREVIATIONS = { cs: 'computer science' }

const words = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

function matchesQuery(program, query) {
  const queryWords = words(query).flatMap((w) => words(ABBREVIATIONS[w] ?? w))
  if (queryWords.length === 0) return true
  // Field labels like "Computer Science / Math" are left out on purpose: they are
  // broad groups, so "computer science" would match Actuarial Science. The Field
  // dropdown covers that kind of search.
  const programWords = words(
    [program.name, program.faculty, program.degree, program.university?.name, program.university?.shortName, program.campus]
      .filter(Boolean)
      .join(' '),
  )
  // Every query word must be the start of some word, so "data science waterloo"
  // works across fields and "cs" doesn't match "physics".
  return queryWords.every((q) => programWords.some((w) => w.startsWith(q)))
}

function compare(sort) {
  const avg = (p) => p.admissionRange?.low ?? -1
  switch (sort) {
    case 'avgHigh':
      return (a, b) => avg(b) - avg(a) || a.name.localeCompare(b.name)
    case 'avgLow':
      return (a, b) => {
        // Programs without a published average go last.
        if (avg(a) < 0 || avg(b) < 0) return avg(b) - avg(a)
        return avg(a) - avg(b) || a.name.localeCompare(b.name)
      }
    default:
      return (a, b) =>
        a.name.localeCompare(b.name) || a.university.name.localeCompare(b.university.name)
  }
}

/**
 * @param {object[]} programs
 * @param {{ query?: string, university?: string, field?: string,
 *           coop?: boolean, supplementary?: 'any'|'required'|'none', sort?: string }} options
 */
export function searchPrograms(programs, options = {}) {
  const { query = '', university = '', field = '', coop = false, supplementary = 'any', sort = 'name' } = options
  return programs
    .filter((p) => matchesQuery(p, query))
    .filter((p) => !university || p.universityId === university)
    .filter((p) => !field || p.field.includes(field))
    .filter((p) => !coop || p.coop)
    .filter((p) => {
      if (supplementary === 'required') return p.supplementary?.required
      if (supplementary === 'none') return !p.supplementary?.required
      return true
    })
    .sort(compare(sort))
}
