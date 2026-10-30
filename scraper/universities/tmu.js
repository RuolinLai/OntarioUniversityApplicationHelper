// Toronto Metropolitan University — https://www.torontomu.ca/programs/undergraduate/<name>/
//
// The program status page links every program that takes applications. Each program page has:
//   <p><strong>Requirements:</strong> <a>Grades-Only</a> <strong>Grade range:</strong> <a>75-80%</a></p>
//   <h3 class="panel-title">Academic requirements for full-time, 4-year program</h3>
//   <section class="panel-collapse">
//     <ul><li>Completion of the Ontario Secondary School Diploma (OSSD)</li>
//         <li>Completion of the following required Grade 12 U courses (minimum grade of 70% in each):</li></ul>
//     <ul><li>English/anglais (ENG4U/EAE4U preferred)</li><li>Advanced Functions (MHF4U)</li>...</ul>

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'tmu'
const BASE = 'https://www.torontomu.ca'
const STATUS_URL = `${BASE}/admissions/undergraduate/apply/program-status/`

export async function listPrograms(fetchPage) {
  const $ = load(await fetchPage(STATUS_URL))
  const urls = new Set()
  $('a[href]').each((_, a) => {
    // Links look like /content/ryerson/programs/undergraduate/biology.html; the public URL is /programs/undergraduate/biology/
    const m = $(a)
      .attr('href')
      .match(/\/programs\/undergraduate\/([a-z0-9-]+)(?:\.html|\/)?$/)
    if (m) urls.add(`${BASE}/programs/undergraduate/${m[1]}/`)
  })
  return [...urls]
}

/** Text after a bold label in the summary box, e.g. "Grade range:" -> "75-80%". */
function summary($, label) {
  const strong = $('p strong')
    .filter((_, s) => new RegExp(`^${label}:?$`, 'i').test(cleanText($(s).text())))
    .first()
  if (!strong.length) return ''
  const parts = []
  for (let node = strong[0].nextSibling; node; node = node.nextSibling) {
    if (node.type === 'tag' && node.name === 'strong') break
    parts.push($(node).text())
  }
  return cleanText(parts.join(' '))
}

export function parseProgram(html, url) {
  const $ = load(html)
  // The heading is either an accordion panel title or a plain <h3>; either way the
  // lists we want come after it, up to the next heading ("Find your requirements").
  const blocks = $('h3, h4, li, p').toArray()
  const start = blocks.findIndex(
    (el) => el.name === 'h3' && /academic requirements/i.test($(el).text()) && !/part-time/i.test($(el).text()),
  )
  if (start < 0) return []
  const end = blocks.findIndex((el, i) => i > start && /^h[34]$/.test(el.name))
  const section = blocks.slice(start + 1, end < 0 ? undefined : end)

  const requirementItems = []
  const supplementarySentences = []
  let minimum = ''
  section
    .filter((el) => el.name === 'li')
    .forEach((li) => {
      const text = cleanText($(li).text())
      if (/^completion of/i.test(text)) {
        // "Completion of the following required Grade 12 U courses (minimum grade of 70% in each):"
        const m = text.match(/minimum grade of (\d{2})\s*%/i)
        if (m && /following/i.test(text)) minimum = ` (minimum grade of ${m[1]}%)`
        return
      }
      // "MCV4U is the preferred mathematics course" is advice, not a requirement.
      if (/\bis the preferred\b/i.test(text)) return
      if (/\b[A-Z]{3}4[UM]\b|\b4[UM]\b/.test(text)) requirementItems.push(text + minimum)
      else supplementarySentences.push(text)
    })
  // Degree-completion programs (e.g. Nursing Post-Diploma) have no high school requirements.
  if (requirementItems.length === 0) return []

  // "Grades-Plus" programs also need a portfolio, audition, essay, etc., described under
  // "Non-academic requirements" (as a heading or as accordion steps like "Step 1: Portfolio").
  if (/grades?-plus/i.test(summary($, 'Requirements'))) {
    const steps = $('.panel-title')
      .map((_, h) => cleanText($(h).text()))
      .get()
      .filter((t) => /^step \d/i.test(t))
    const nonAcademic = $('h3')
      .filter((_, h) => /non-academic requirements/i.test($(h).text()))
      .first()
      .parent()
      .text()
    supplementarySentences.push(
      cleanText(`Grades-Plus program: supplementary (non-academic) requirements are required. ${steps.join('. ')} ${nonAcademic}`),
    )
  }

  const name = cleanText($('h1').first().text()).replace(/\s+-\s+.*$/, '') || cleanText($('title').text())
  const degree = cleanText($('h1').first().text()).match(/\s-\s+(.*)$/)?.[1] ?? ''

  return [
    {
      id: `${id}-${slugify(name)}`,
      name,
      degree,
      requirementItems,
      averageText: summary($, 'Grade range'),
      supplementarySentences,
      coop: $('h2, h3').filter((_, h) => /co-?op/i.test($(h).text())).length > 0,
      description: cleanText($('meta[name="description"]').attr('content')),
      officialUrl: url,
    },
  ]
}
