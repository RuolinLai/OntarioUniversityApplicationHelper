// Filtering for the Tips page. Pure functions so they can be unit tested.

export const TIP_CATEGORIES = ['Interview', 'AIF / Supplementary', 'General Application', 'Grades & Averages', 'Offers & Decisions']

const words = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/**
 * @param tips      tips.json entries
 * @param category  '' for all
 * @param university  '' for all; otherwise tips for that university plus general tips
 * @param query     words that must all appear (as word starts) in the title or summary
 */
export function filterTips(tips, { category = '', university = '', query = '' } = {}) {
  const queryWords = words(query)
  return tips.filter((tip) => {
    if (category && tip.category !== category) return false
    if (university && tip.universities.length > 0 && !tip.universities.includes(university)) return false
    if (queryWords.length) {
      const tipWords = words(`${tip.title} ${tip.summary}`)
      if (!queryWords.every((q) => tipWords.some((w) => w.startsWith(q)))) return false
    }
    return true
  })
}

/** Tips for one university first, then general ones — used when a university is selected. */
export function sortTips(tips, university = '') {
  if (!university) return tips
  return [...tips].sort((a, b) => Number(b.universities.includes(university)) - Number(a.universities.includes(university)))
}
