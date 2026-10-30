import { describe, it, expect } from 'vitest'
import { parseRobots, isAllowed } from './robots.js'

const robots = `
User-agent: *
Disallow: /search/
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /*.pdf$

User-agent: GPTBot
User-agent: BadBot
Disallow: /
`

describe('robots.txt', () => {
  const groups = parseRobots(robots)

  it('allows normal pages', () => {
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/program/computer-science')).toBe(true)
  })

  it('blocks disallowed paths', () => {
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/search/?q=cs')).toBe(false)
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/files/viewbook.pdf')).toBe(false)
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/files/viewbook.pdf?x=1')).toBe(true)
  })

  it('more specific Allow beats Disallow', () => {
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/wp-admin/admin-ajax.php')).toBe(true)
    expect(isAllowed(groups, 'OntarioUHelper/1.0', '/wp-admin/edit.php')).toBe(false)
  })

  it('uses the group for a named agent', () => {
    expect(isAllowed(groups, 'Mozilla/5.0 (compatible; GPTBot/1.0)', '/program/x')).toBe(false)
    expect(isAllowed(groups, 'BadBot', '/')).toBe(false)
  })

  it('"Disallow: /" for everyone blocks everything', () => {
    expect(isAllowed(parseRobots('User-agent: *\nDisallow: /'), 'OntarioUHelper', '/anything')).toBe(false)
  })

  it('empty robots.txt allows everything', () => {
    expect(isAllowed(parseRobots(''), 'OntarioUHelper', '/anything')).toBe(true)
  })
})
