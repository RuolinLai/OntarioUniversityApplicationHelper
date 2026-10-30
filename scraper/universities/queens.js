// Queen's University — https://www.queensu.ca/admission/applying/admission-requirements/ontario
//
// One page lists every program's Ontario requirements as sentences, grouped by faculty:
//   <div class="program-requirement-collection"><h3>Computing</h3>
//     <h4>Computing (QD)</h4>
//     <p>English 4U, Advanced Functions 4U, and Calculus and Vectors 4U. Additional three ...</p>
//     <p>Mandatory supplementary application.</p>
// Admission averages are on a separate page, in a table keyed by the same code:
//   <tr><td>Computing (QD)</td><td>High-70s</td></tr>
// Programs appear under more than one faculty (Concurrent Education), so we keep the first.

import { load } from 'cheerio'
import { cleanText, slugify, splitRequirementText, findCourses } from '../normalize.js'

export const id = 'queens'
const REQUIREMENTS_URL = 'https://www.queensu.ca/admission/applying/admission-requirements/ontario'
const AVERAGES_URL = 'https://www.queensu.ca/admission/applying/competitive-average'

const codeOf = (text) => text.match(/\((Q[A-Z]{1,3})\)/)?.[1]

export async function listPrograms() {
  return [REQUIREMENTS_URL]
}

/** Reads the competitive average table: { QD: "High-70s", ... } */
export function parseAverages(html) {
  const $ = load(html)
  const averages = {}
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td')
    const code = codeOf($(cells[0]).text())
    if (code) averages[code] = cleanText($(cells[1]).text())
  })
  return averages
}

export async function prepare(fetchPage) {
  return { averages: parseAverages(await fetchPage(AVERAGES_URL)) }
}

export function parseProgram(html, url, { averages = {} } = {}) {
  const $ = load(html)
  const programs = new Map()

  $('h4').each((_, h) => {
    const title = cleanText($(h).text())
    const code = codeOf(title)
    if (!code || programs.has(code)) return

    const name = cleanText(title.replace(`(${code})`, ''))
    const faculty = cleanText($(h).closest('.program-requirement-collection').find('h3').first().text())
    const requirementItems = []
    const supplementarySentences = []
    $(h)
      .nextUntil('h3, h4')
      .each((_, el) => {
        const text = cleanText($(el).text())
        // Course sentences mention a course; others are things like "Personal audition and interview."
        if (findCourses(text).length || /\b4[UM]\b/.test(text)) requirementItems.push(...splitRequirementText(text))
        else if (text) supplementarySentences.push(/\b(required|mandatory)\b/i.test(text) ? text : `${text} (required)`)
      })

    programs.set(code, {
      id: `${id}-${slugify(name)}`,
      name,
      faculty,
      requirementItems,
      averageText: averages[code] ?? '',
      supplementarySentences,
      coop: false,
      description: '',
      officialUrl: url,
    })
  })
  return [...programs.values()]
}
