export const SORT_OPTIONS = {
  name: 'Name (A–Z)',
  avgHigh: 'Admission average (high → low)',
  avgLow: 'Admission average (low → high)',
}

function matchesQuery(program, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    program.name,
    program.faculty,
    program.degree,
    program.university?.name,
    program.university?.shortName,
    ...program.field,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  // Every word in the query must appear somewhere, so "waterloo cs" style
  // searches work across fields: "data science waterloo".
  return q.split(/\s+/).every((word) => haystack.includes(word))
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
