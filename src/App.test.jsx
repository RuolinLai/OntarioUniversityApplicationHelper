import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import App from './App.jsx'
import { allPrograms, grade12Courses, groupBySubject } from './lib/data.js'
import { firebaseConfigured } from './firebase.js'

function render(url) {
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

describe('pages render without crashing', () => {
  it.each(['/', '/programs', '/for-you', '/calendar', '/tips', '/profile', '/profile/courses/MCV4U', '/onboarding', '/login', '/signup'])('%s', (url) => {
    expect(render(url)).toContain('OntarioU Helper')
  })

  it('search results come from the URL query', () => {
    const html = render('/programs?q=accounting')
    expect(html).toContain('Accounting and Financial Management')
    expect(html).not.toContain('Mechanical Engineering')
  })

  it('every program has a working detail page', () => {
    for (const p of allPrograms) {
      const html = render(`/programs/${p.id}`)
      expect(html).toContain(p.university.name)
      expect(html).toContain(p.officialUrl)
    }
  }, 30_000) // renders every program (~460 pages)

  // Tests run without .env.local, so account pages should explain that instead of crashing.
  it.skipIf(firebaseConfigured).each(['/login', '/signup', '/profile', '/onboarding'])('%s explains missing Firebase config', (url) => {
    expect(render(url)).toContain('Accounts aren')
  })

  it('unknown program shows not found', () => {
    expect(render('/programs/does-not-exist')).toContain('Page not found')
  })
})

describe('program data', () => {
  it('every program has a known university and valid prerequisites', () => {
    for (const p of allPrograms) {
      expect(p.university, p.id).toBeDefined()
      expect(Array.isArray(p.prerequisites.required), p.id).toBe(true)
      expect(Array.isArray(p.prerequisites.choose), p.id).toBe(true)
      for (const group of p.prerequisites.choose) {
        expect(group.count, p.id).toBeGreaterThan(0)
        expect(group.courses.length, p.id).toBeGreaterThan(group.count)
      }
    }
  })

  it('program ids are unique', () => {
    const ids = allPrograms.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('course data', () => {
  it('every Grade 12 course is in a subject group', () => {
    const groups = groupBySubject(grade12Courses)
    expect(groups.some(([subject]) => subject === 'Other')).toBe(false)
    expect(groups.flatMap(([, list]) => list).length).toBe(grade12Courses.length)
  })
})
