import { describe, it, expect } from 'vitest'
import { searchPrograms, similarPrograms } from './search.js'
import { formatRange, formatPrerequisites } from './format.js'

const uw = { id: 'waterloo', name: 'University of Waterloo', shortName: 'Waterloo' }
const uoft = { id: 'toronto', name: 'University of Toronto', shortName: 'UofT' }

const programs = [
  { id: 'a', name: 'Computer Science', universityId: 'waterloo', university: uw, faculty: 'Mathematics', field: ['Computer Science / Math'], coop: true, supplementary: { required: true }, admissionRange: { low: 90, high: 96 } },
  { id: 'b', name: 'Data Science', universityId: 'toronto', university: uoft, faculty: 'Arts & Science', field: ['Computer Science / Math'], coop: false, supplementary: { required: false }, admissionRange: { low: 85, high: 89 } },
  { id: 'c', name: 'Engineering', universityId: 'toronto', university: uoft, faculty: 'Engineering', field: ['Engineering'], coop: false, supplementary: { required: true }, admissionRange: null },
]

const ids = (list) => list.map((p) => p.id)

describe('searchPrograms', () => {
  it('returns everything for an empty query', () => {
    expect(ids(searchPrograms(programs))).toEqual(['a', 'b', 'c'])
  })

  it('matches program names case-insensitively and partially', () => {
    expect(ids(searchPrograms(programs, { query: 'data' }))).toEqual(['b'])
    expect(ids(searchPrograms(programs, { query: 'SCIENCE' }))).toEqual(['a', 'b'])
  })

  it('matches across fields when the query has several words', () => {
    expect(ids(searchPrograms(programs, { query: 'science waterloo' }))).toEqual(['a'])
    expect(ids(searchPrograms(programs, { query: 'uoft engineering' }))).toEqual(['c'])
  })

  it('does not match broad field labels or the middle of words', () => {
    const actuarial = { ...programs[1], id: 'd', name: 'Actuarial Science', faculty: 'Mathematics' }
    const physics = { ...programs[1], id: 'e', name: 'Physics', faculty: 'Arts & Science' }
    const list = [...programs, actuarial, physics]
    expect(ids(searchPrograms(list, { query: 'computer science' }))).toEqual(['a'])
    expect(ids(searchPrograms(list, { query: 'cs' }))).toEqual(['a'])
    expect(ids(searchPrograms(list, { query: 'comp sci' }))).toEqual(['a'])
  })

  it('filters by university, field, co-op and supplementary', () => {
    expect(ids(searchPrograms(programs, { university: 'toronto' }))).toEqual(['b', 'c'])
    expect(ids(searchPrograms(programs, { field: 'Engineering' }))).toEqual(['c'])
    expect(ids(searchPrograms(programs, { coop: true }))).toEqual(['a'])
    expect(ids(searchPrograms(programs, { supplementary: 'none' }))).toEqual(['b'])
  })

  it('sorts by admission average and puts unpublished ones last', () => {
    expect(ids(searchPrograms(programs, { sort: 'avgHigh' }))).toEqual(['a', 'b', 'c'])
    expect(ids(searchPrograms(programs, { sort: 'avgLow' }))).toEqual(['b', 'a', 'c'])
  })
})

describe('formatRange', () => {
  it('formats ranges', () => {
    expect(formatRange({ low: 90, high: 96 })).toBe('90–96%')
    expect(formatRange({ low: 90, high: null })).toBe('90%+')
    expect(formatRange(null)).toBe('Not published')
    expect(formatRange({ low: null, high: null, rawText: '' })).toBe('Not published')
  })
})

describe('formatPrerequisites', () => {
  it('summarises required and choose groups', () => {
    expect(formatPrerequisites({ required: ['ENG4U', 'MCV4U'], choose: [{ count: 2, courses: ['SBI4U', 'SCH4U', 'SPH4U'] }] })).toBe(
      'ENG4U, MCV4U + two of SBI4U/SCH4U/SPH4U',
    )
    expect(formatPrerequisites({ required: [], choose: [] })).toBe('No specific courses')
  })

  it('summarises long choice lists', () => {
    const courses = ['HFA4M', 'HHS4M', 'CIA4U', 'CGW4U', 'CHY4U', 'SBI4U']
    expect(formatPrerequisites({ required: ['ENG4U'], choose: [{ count: 1, courses }] })).toBe('ENG4U + one of 6 courses')
  })
})

describe('similarPrograms', () => {
  const mk = (id, name, universityId, low = null) => ({ id, name, universityId, admissionRange: { low } })
  const all = [
    mk('uw-cs', 'Computer Science', 'waterloo', 90),
    mk('york-cs-ba', 'Computer Science', 'york', 80),
    mk('york-cs-bsc', 'Computer Science', 'york', 80),
    mk('ott-cs', 'Honours BSc Computer Science', 'ottawa', 85),
    mk('uw-ce', 'Computer Engineering', 'waterloo', 95),
    mk('tmu-cs', 'Computer Science (Co-op)', 'tmu'),
  ]

  it('finds the same subject at other universities, one each, highest range first', () => {
    expect(similarPrograms(all[0], all).map((p) => p.id)).toEqual(['ott-cs', 'york-cs-ba', 'tmu-cs'])
  })
})
