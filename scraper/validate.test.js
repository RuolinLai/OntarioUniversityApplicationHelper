import { describe, it, expect } from 'vitest'
import { validatePrograms, checkUniversity } from './validate.js'

const program = (id, extra = {}) => ({ id, name: id, officialUrl: `https://x/${id}`, source: 'scraper', ...extra })

describe('validatePrograms', () => {
  it('drops programs without a name or URL and duplicates', () => {
    const { valid, invalid } = validatePrograms([program('a'), program('a'), program('b', { name: '' }), program('c', { officialUrl: '' })])
    expect(valid.map((p) => p.id)).toEqual(['a'])
    expect(invalid.map((p) => p.reason)).toEqual(['duplicate id', 'missing name', 'missing official URL'])
  })
})

describe('checkUniversity', () => {
  const previous = Array.from({ length: 10 }, (_, i) => program(`p${i}`))

  it('accepts a normal run', () => {
    expect(checkUniversity({ programs: previous.slice(0, 9), previous, pagesTried: 10, pagesFailed: 1 }).ok).toBe(true)
  })

  it('rejects a run that found nothing', () => {
    expect(checkUniversity({ programs: [], previous: [], pagesTried: 0, pagesFailed: 0 }).ok).toBe(false)
  })

  it('rejects a big drop in program count (adapter probably broken)', () => {
    const result = checkUniversity({ programs: previous.slice(0, 5), previous, pagesTried: 10, pagesFailed: 0 })
    expect(result.ok).toBe(false)
    expect(result.reasons[0]).toMatch(/only 5 programs/)
  })

  it('ignores sample data when comparing counts', () => {
    const samples = previous.map((p) => ({ ...p, source: 'sample' }))
    expect(checkUniversity({ programs: [program('x')], previous: samples, pagesTried: 1, pagesFailed: 0 }).ok).toBe(true)
  })

  it('rejects when too many pages failed', () => {
    expect(checkUniversity({ programs: previous, previous, pagesTried: 10, pagesFailed: 4 }).ok).toBe(false)
  })
})
