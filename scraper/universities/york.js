// York University — https://futurestudents.yorku.ca/program-search
//
// Each program page lists requirements for every curriculum; the Ontario ones are
// marked data-shortcode="on", one block per degree:
//   <div class="requirements-content-content"><h3>BSc</h3>
//     <div class="ds-admit-req-equivalency" data-shortcode="on" data-cohort="Ontario High School">
//       <li><strong>ENG4U</strong></li><li><strong>SCH4U</strong> or <strong>SPH4U</strong></li>
//       <li><strong>4U math</strong></li><li>And <strong>three additional 4U or M courses</strong></li>
//       <span class="equivalency-public-offering">Applicants with averages in the <strong>low 80s</strong> or higher ...</span>
// The "At a Glance" box has <h3>Offered by</h3>, <h3>Offered at</h3> and <h3>Applied Learning Opportunities</h3>.

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'york'
const BASE = 'https://futurestudents.yorku.ca'

export async function listPrograms(fetchPage) {
  const $ = load(await fetchPage(`${BASE}/program-search`))
  const urls = new Set()
  $('a[href]').each((_, a) => {
    const url = new URL($(a).attr('href'), BASE)
    const path = url.pathname.replace(/\/$/, '')
    // Certificates aren't degree programs you apply to from high school.
    if (url.host === 'futurestudents.yorku.ca' && /^\/program\/(?!certificates\/)[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(path)) {
      urls.add(BASE + path)
    }
  })
  return [...urls]
}

const SUBJECTS = {
  math: ['MHF4U', 'MCV4U', 'MDM4U'],
  science: ['SBI4U', 'SCH4U', 'SPH4U', 'SES4U'],
  french: ['FSF4U', 'FEF4U'],
}

/**
 * York writes "4U math" for "any Grade 12 U math" (and "MHF4U" + "4U math" for
 * "Advanced Functions and one more math"). Spell out the courses so the
 * normalizer understands them.
 */
export function rewriteItem(text, items) {
  const m = text.match(/^(?:one )?(?:additional )?4U (math|science|french)\w*\b(.*)$/i)
  if (!m) return text
  const options = SUBJECTS[m[1].toLowerCase()].filter((c) => !items.includes(c))
  return `One of ${options.join(' or ')}${m[2]}`
}

// Programs that high school students can't apply to directly.
const NOT_DIRECT_ENTRY =
  /not for direct entry|years? of (degree level )?university|full-year of undergraduate|licensed registered nurse|law school admission test/i
const NOT_DIRECT_ENTRY_DEGREE = /post-degree|second entry|^JD$/i

// Course items mention a course ("ENG4U", "4U math"); anything else is a note.
const isCourseItem = (text) => /\b[A-Z]{3}4[UM]\b|\b4[UM]\b/.test(text) && text.length < 150

export function parseProgram(html, url) {
  const $ = load(html)
  const glance = (label) =>
    $('h3')
      .filter((_, h) => new RegExp(`^${label}$`, 'i').test(cleanText($(h).text())))
      .first()
      .next()
  const name = cleanText($('h1').first().text())
  const faculty = cleanText(glance('offered by').text())
  const campus = cleanText(glance('offered at').text()).replace(/\s+campus$/i, '')
  const coop = /co-?op/i.test(glance('applied learning opportunities').text())
  const description = cleanText($('meta[name="description"]').attr('content'))
  const path = new URL(url).pathname.replace(/^\/program\//, '').replace(/\/$/, '')

  const programs = []
  $('.ds-admit-req-equivalency[data-shortcode="on"]').each((_, block) => {
    const degree = cleanText($(block).closest('.requirements-content-content').find('h3').first().text())
    // iBA / iBSc are the same programs with an international focus and identical requirements.
    if (!degree || /^i[A-Z]/.test(degree) || NOT_DIRECT_ENTRY_DEGREE.test(degree)) return

    const box = $(block)
    const items = box
      .find('.equivalency-body > li')
      .map((_, li) => cleanText($(li).text()))
      .get()
      .filter((t) => !/secondary school diploma|\bOSSD\b/i.test(t) && !t.startsWith('*'))
    if (items.some((t) => NOT_DIRECT_ENTRY.test(t))) return
    const courseItems = items.filter(isCourseItem)
    const requirementItems = courseItems.map((t) => rewriteItem(t, courseItems))
    const averageText = cleanText(box.find('.equivalency-requirement-average .equivalency-public-offering').first().text())
    const extra = box
      .find('.equivalency-body > p, .equivalency-body > div:not(.equivalency-requirement-average)')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t && !/^requirements for admission/i.test(t) && !/^OUAC code/i.test(t))

    programs.push({
      id: `${id}-${slugify(path)}-${slugify(degree)}`,
      name,
      campus,
      faculty,
      degree,
      requirementItems,
      averageText,
      supplementarySentences: [...items.filter((t) => !isCourseItem(t)), ...extra],
      coop,
      description,
      officialUrl: url,
    })
  })
  return programs
}
