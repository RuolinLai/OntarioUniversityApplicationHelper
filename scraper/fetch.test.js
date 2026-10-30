import { describe, it, expect } from 'vitest'
import { isBotChallenge } from './fetch.js'

describe('isBotChallenge', () => {
  it('recognises a JavaScript cookie challenge page', () => {
    const challenge = `<html><head><script>function go(){ document.cookie="AS_chal=1"; document.location.reload(true); }</script></head><body onload="go()"></body></html>`
    expect(isBotChallenge(challenge)).toBe(true)
  })

  it('does not flag normal pages', () => {
    expect(isBotChallenge('<html><body><h1>Computer Science</h1></body></html>')).toBe(false)
    // Big real pages may set cookies (analytics) — only small pages count as challenges.
    expect(isBotChallenge('x'.repeat(50_000) + 'document.cookie = "a"; location.reload()')).toBe(false)
  })
})
