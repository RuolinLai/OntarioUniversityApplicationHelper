import { describe, it, expect } from 'vitest'
import { admissionAverage, buildMarkTable } from './average.js'
import { checkEligibility } from './eligibility.js'
import { assessProgram, classify, recommendFields } from './recommend.js'

const marks = (obj) => new Map(Object.entries(obj).map(([code, mark]) => [code, { mark, estimated: false, from: null }]))

const lifeSci = {
  prerequisites: {
    required: ['ENG4U', 'MCV4U'],
    choose: [{ count: 2, courses: ['SBI4U', 'SCH4U', 'SPH4U'] }],
    minimums: { MCV4U: 70 },
  },
  admissionRange: { low: 85, high: 90 },
  supplementary: { required: false },
}

describe('buildMarkTable', () => {
  it('uses the course mark, else a Grade 11 estimate, else leaves the course out', () => {
    const table = buildMarkTable(
      [
        { code: 'ENG4U', finalMark: 91, assessments: [] },
        { code: 'MCV4U', finalMark: null, assessments: [] },
        { code: 'AVI4M', finalMark: null, assessments: [] },
      ],
      [{ code: 'MCR3U', mark: 88 }],
    )
    expect(table.get('ENG4U')).toEqual({ mark: 91, estimated: false, from: null })
    expect(table.get('MCV4U')).toEqual({ mark: 88, estimated: true, from: 'MCR3U' })
    expect(table.has('AVI4M')).toBe(false)
  })
})

describe('admissionAverage', () => {
  it('includes required courses even when they are not the highest marks', () => {
    const table = marks({ ENG4U: 70, MCV4U: 80, SBI4U: 90, SCH4U: 85, SPH4U: 60, AVI4M: 99, HSB4U: 95, CHY4U: 94 })
    const result = admissionAverage(lifeSci, table)
    // ENG4U, MCV4U + SBI4U, SCH4U + AVI4M, HSB4U
    expect(result.courses.map((c) => c.code)).toEqual(['ENG4U', 'MCV4U', 'SBI4U', 'SCH4U', 'AVI4M', 'HSB4U'])
    expect(result.average).toBeCloseTo((70 + 80 + 90 + 85 + 99 + 95) / 6)
    expect(result.complete).toBe(true)
    expect(result.estimated).toBe(false)
  })

  it('without a program, takes the best six', () => {
    const table = marks({ A: 50, B: 90, C: 80, D: 70, E: 60, F: 100, G: 40 })
    expect(admissionAverage(null, table).average).toBeCloseTo(75)
  })

  it('marks the result as estimated or incomplete', () => {
    const table = new Map([
      ['ENG4U', { mark: 80, estimated: false }],
      ['MCV4U', { mark: 90, estimated: true, from: 'MCR3U' }],
    ])
    const result = admissionAverage(lifeSci, table)
    expect(result.average).toBeCloseTo(85)
    expect(result.estimated).toBe(true)
    expect(result.complete).toBe(false)
  })

  it('returns null with no marks', () => {
    expect(admissionAverage(lifeSci, new Map())).toBeNull()
  })
})

describe('checkEligibility', () => {
  it('eligible when required and choose groups are covered', () => {
    expect(checkEligibility(lifeSci, ['ENG4U', 'MCV4U', 'SBI4U', 'SPH4U']).status).toBe('eligible')
  })

  it('missing one required course', () => {
    const result = checkEligibility(lifeSci, ['ENG4U', 'SBI4U', 'SPH4U'])
    expect(result.status).toBe('missingOne')
    expect(result.missing).toEqual([{ code: 'MCV4U' }])
  })

  it('missing one course from a choose group', () => {
    const result = checkEligibility(lifeSci, ['ENG4U', 'MCV4U', 'SBI4U'])
    expect(result.status).toBe('missingOne')
    expect(result.missing).toEqual([{ count: 1, courses: ['SCH4U', 'SPH4U'] }])
  })

  it('not eligible when two or more courses are missing', () => {
    expect(checkEligibility(lifeSci, ['ENG4U']).status).toBe('notEligible')
  })

  it('a required course does not also count for a choose group', () => {
    const program = { prerequisites: { required: ['SCH4U'], choose: [{ count: 1, courses: ['SCH4U', 'SBI4U'] }] } }
    expect(checkEligibility(program, ['SCH4U']).status).toBe('missingOne')
  })

  it('flags marks under a course minimum', () => {
    const result = checkEligibility(lifeSci, ['ENG4U', 'MCV4U', 'SBI4U', 'SCH4U'], marks({ MCV4U: 65 }))
    expect(result.status).toBe('eligible')
    expect(result.belowMinimum).toEqual([{ code: 'MCV4U', minimum: 70, mark: 65 }])
  })

  it('unknown when the requirements need review', () => {
    expect(checkEligibility({ ...lifeSci, needsReview: true }, []).status).toBe('unknown')
  })
})

describe('classify', () => {
  const range = { low: 85, high: 90 }
  it.each([
    [91.1, 'safety'],
    [91, 'match'],
    [90, 'match'],
    [89, 'match'],
    [88.9, 'reach'],
    [85, 'reach'],
    [80, 'reach'],
    [79.9, null],
  ])('%s → %s', (avg, expected) => {
    expect(classify(avg, range)).toBe(expected)
  })

  it('being inside a wide range is not a match (Waterloo CS: 90–96, avg 92)', () => {
    expect(classify(92, { low: 90, high: 96 })).toBe('reach')
    expect(classify(95, { low: 90, high: 96 })).toBe('match')
    expect(classify(97.5, { low: 90, high: 96 })).toBe('safety')
  })

  it('caps programs with a supplementary application at match', () => {
    expect(classify(99, range, true)).toBe('match')
    expect(classify(82, range, true)).toBe('reach')
  })

  it('skips programs with no published range', () => {
    expect(classify(95, { low: null, high: null })).toBeNull()
    expect(classify(95, undefined)).toBeNull()
  })

  it('a "90%+" range with no high end uses the low end', () => {
    expect(classify(92, { low: 90, high: null })).toBe('safety')
    expect(classify(90.5, { low: 90, high: null })).toBe('match')
  })
})

describe('assessProgram', () => {
  it('combines eligibility, average and category', () => {
    const table = marks({ ENG4U: 90, MCV4U: 90, SBI4U: 90, SCH4U: 90, HSB4U: 90, CHY4U: 90 })
    const result = assessProgram(lifeSci, [...table.keys()], table)
    expect(result.eligibility.status).toBe('eligible')
    expect(result.admission.average).toBeCloseTo(90)
    expect(result.category).toBe('match') // within 1 of the 90 top end
  })
})

describe('recommendFields', () => {
  it('ranks fields by how many key courses the student takes', () => {
    const fields = recommendFields(['MCV4U', 'MHF4U', 'SPH4U', 'SCH4U', 'ENG4U', 'ICS4U'])
    expect(fields.map((f) => f.field)).toEqual(['Engineering', 'Computer Science / Math', 'Physical Sciences / Environment'])
    expect(fields[0].missing).toEqual([])
  })

  it('leaves out fields with no key courses', () => {
    const fields = recommendFields(['ENG4U', 'SBI4U'], marks({ ENG4U: 70, SBI4U: 95 }))
    expect(fields.map((f) => f.field)).toEqual(['Life Sciences / Health', 'Social Sciences / Humanities'])
  })
})
