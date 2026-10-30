import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import App from './App.jsx'
import { allPrograms } from './lib/data.js'

function render(url) {
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

describe('pages render without crashing', () => {
  it.each(['/', '/programs', '/for-you', '/calendar', '/tips', '/profile', '/login'])('%s', (url) => {
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
