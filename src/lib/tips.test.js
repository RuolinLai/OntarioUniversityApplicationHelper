import { describe, it, expect } from 'vitest'
import { filterTips, sortTips, TIP_CATEGORIES } from './tips.js'
import tips from '../data/tips.json'

const sample = [
  { id: 'a', title: 'Waterloo AIF advice', category: 'AIF / Supplementary', universities: ['waterloo'], summary: 'Be specific.' },
  { id: 'b', title: 'Practise interviews', category: 'Interview', universities: [], summary: 'Use a timer.' },
  { id: 'c', title: 'Queens waitlist', category: 'Offers & Decisions', universities: ['queens'], summary: 'Keep marks up.' },
]

describe('filterTips', () => {
  it('filters by category', () => {
    expect(filterTips(sample, { category: 'Interview' }).map((t) => t.id)).toEqual(['b'])
  })

  it('keeps general tips when a university is selected', () => {
    expect(filterTips(sample, { university: 'waterloo' }).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('matches every query word against the title and summary', () => {
    expect(filterTips(sample, { query: 'timer' }).map((t) => t.id)).toEqual(['b'])
    expect(filterTips(sample, { query: 'waterloo spec' }).map((t) => t.id)).toEqual(['a'])
    expect(filterTips(sample, { query: 'waterloo timer' })).toEqual([])
  })
})

describe('sortTips', () => {
  it('puts the selected university first', () => {
    expect(sortTips([sample[1], sample[0]], 'waterloo').map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('tips.json', () => {
  it('has at least 30 well-formed tips', () => {
    expect(tips.length).toBeGreaterThanOrEqual(30)
    const ids = new Set()
    for (const tip of tips) {
      expect(TIP_CATEGORIES).toContain(tip.category)
      expect(tip.title && tip.summary).toBeTruthy()
      expect(Array.isArray(tip.universities)).toBe(true)
      expect(ids.has(tip.id)).toBe(false)
      ids.add(tip.id)
    }
  })
})
