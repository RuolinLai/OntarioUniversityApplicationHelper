// Safety checks that stop a broken adapter from wiping out good data.
// If a university's site was redesigned, the adapter usually finds far fewer
// programs (or none). In that case we keep last week's data and report it.

export const MIN_KEEP_RATIO = 0.7 // new count must be at least 70% of the previous count
export const MAX_FAILURE_RATIO = 0.3 // at most 30% of pages may fail to download

/** Drops programs missing the basics. Returns { valid, invalid: [{ id, reason }] }. */
export function validatePrograms(programs) {
  const valid = []
  const invalid = []
  const seen = new Set()
  for (const p of programs) {
    if (!p.name) invalid.push({ id: p.id, reason: 'missing name' })
    else if (!p.officialUrl) invalid.push({ id: p.id, reason: 'missing official URL' })
    else if (seen.has(p.id)) invalid.push({ id: p.id, reason: 'duplicate id' })
    else {
      seen.add(p.id)
      valid.push(p)
    }
  }
  return { valid, invalid }
}

/**
 * Decides whether this run's results for one university can replace the old data.
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkUniversity({ programs, previous, pagesTried, pagesFailed }) {
  const reasons = []
  if (programs.length === 0) reasons.push('no programs found')

  const previousScraped = previous.filter((p) => p.source === 'scraper').length
  if (previousScraped > 0 && programs.length < previousScraped * MIN_KEEP_RATIO) {
    reasons.push(`only ${programs.length} programs found, previously ${previousScraped}`)
  }
  if (pagesTried > 0 && pagesFailed / pagesTried > MAX_FAILURE_RATIO) {
    reasons.push(`${pagesFailed} of ${pagesTried} pages failed to download`)
  }
  return { ok: reasons.length === 0, reasons }
}
