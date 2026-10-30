import { describe, it, expect } from 'vitest'
import { courseAverage, courseMark, averageOf, estimateFromGrade11, grade11PrerequisitesOf, formatMark } from './average.js'

describe('courseAverage', () => {
  it('weights each assessment', () => {
    const assessments = [
      { name: 'Test', mark: 80, outOf: 100, weight: 30 },
      { name: 'Quiz', mark: 9, outOf: 10, weight: 10 },
    ]
    // (0.8 × 30 + 0.9 × 10) / 40 = 82.5%
    expect(courseAverage(assessments)).toBeCloseTo(82.5)
  })

  it('returns null when nothing is entered', () => {
    expect(courseAverage([])).toBeNull()
    expect(courseAverage(undefined)).toBeNull()
  })

  it('skips assessments that are missing a mark, total or weight', () => {
    const assessments = [
      { name: 'Test', mark: 45, outOf: 50, weight: 20 },
      { name: 'Not marked yet', mark: null, outOf: 100, weight: 20 },
      { name: 'Bad total', mark: 5, outOf: 0, weight: 10 },
      { name: 'No weight', mark: 1, outOf: 100, weight: 0 },
    ]
    expect(courseAverage(assessments)).toBeCloseTo(90)
  })

  it('accepts numbers typed as strings', () => {
    expect(courseAverage([{ mark: '7', outOf: '10', weight: '5' }])).toBeCloseTo(70)
  })
})

describe('courseMark', () => {
  it('prefers the final mark', () => {
    expect(courseMark({ finalMark: 95, assessments: [{ mark: 50, outOf: 100, weight: 1 }] })).toBe(95)
  })

  it('falls back to the assessment average', () => {
    expect(courseMark({ finalMark: null, assessments: [{ mark: 50, outOf: 100, weight: 1 }] })).toBe(50)
    expect(courseMark({ assessments: [] })).toBeNull()
  })
})

describe('averageOf', () => {
  it('ignores missing marks', () => {
    expect(averageOf([90, null, 80])).toBe(85)
    expect(averageOf([null])).toBeNull()
  })
})

describe('Grade 11 estimates', () => {
  it('knows which Grade 11 courses lead to a Grade 12 course', () => {
    expect(grade11PrerequisitesOf('MCV4U')).toEqual(['MCR3U'])
    expect(grade11PrerequisitesOf('MDM4U')).toEqual(['MCR3U', 'MCF3M'])
  })

  it('uses the best matching Grade 11 mark', () => {
    const marks = [
      { code: 'MCR3U', mark: 88 },
      { code: 'MCF3M', mark: 93 },
      { code: 'SCH3U', mark: 99 },
    ]
    expect(estimateFromGrade11('MCV4U', marks)).toEqual({ mark: 88, from: 'MCR3U' })
    expect(estimateFromGrade11('MDM4U', marks)).toEqual({ mark: 93, from: 'MCF3M' })
    expect(estimateFromGrade11('ENG4U', marks)).toBeNull()
  })
})

it('formatMark rounds to one decimal', () => {
  expect(formatMark(82.456)).toBe('82.5%')
  expect(formatMark(null)).toBe('—')
})
