// Program pages can be opened from several places. Links pass `state={fromHere(location)}` so the
// program page's back link returns to the exact page (and search/filters) the student came from.

const LABELS = {
  '/': 'dashboard',
  '/programs': 'programs',
  '/for-you': 'For You',
  '/calendar': 'calendar',
  '/profile': 'profile',
}

export function fromHere(location) {
  return { from: location.pathname + location.search }
}

// → { to, label }; label is null for pages without a name. Opened directly (typed URL, new tab) → back to the program list.
export function backLink(state) {
  const from = typeof state?.from === 'string' && state.from.startsWith('/') ? state.from : '/programs'
  const path = from.split('?')[0]
  const tab = new URLSearchParams(from.split('?')[1] ?? '').get('tab')
  const label = path === '/profile' && tab === 'favourites' ? 'favourites' : (LABELS[path] ?? null)
  return { to: from, label }
}
