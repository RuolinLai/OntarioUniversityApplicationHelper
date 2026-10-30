import { describe, it, expect } from 'vitest'
import { searchPrograms } from './search.js'
import { formatRange } from './format.js'

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
  })
})
