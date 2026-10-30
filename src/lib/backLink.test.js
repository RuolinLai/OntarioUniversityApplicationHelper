import { describe, it, expect } from 'vitest'
import { backLink, fromHere } from './backLink.js'

describe('backLink', () => {
  it('returns to the page the program was opened from', () => {
    expect(backLink(fromHere({ pathname: '/for-you', search: '?field=all' }))).toEqual({ to: '/for-you?field=all', label: 'For You' })
    expect(backLink({ from: '/calendar' })).toEqual({ to: '/calendar', label: 'calendar' })
    expect(backLink({ from: '/' })).toEqual({ to: '/', label: 'dashboard' })
    expect(backLink({ from: '/programs?q=math' })).toEqual({ to: '/programs?q=math', label: 'programs' })
    expect(backLink({ from: '/profile?tab=favourites' })).toEqual({ to: '/profile?tab=favourites', label: 'favourites' })
  })

  it('falls back to the program list when opened directly', () => {
    expect(backLink(null)).toEqual({ to: '/programs', label: 'programs' })
    expect(backLink({ from: 'https://example.com' })).toEqual({ to: '/programs', label: 'programs' })
  })

  it('has no label for other pages', () => {
    expect(backLink({ from: '/tips' })).toEqual({ to: '/tips', label: null })
  })
})
