// University of Toronto — https://future.utoronto.ca/program/<name>
//
// One page per area of study, with a block for each campus that offers it:
//   <div class="o-campus" id="campus-utsg">
//     <h2>St. George campus</h2><div class="o-campus__subtitle">Faculty of Arts & Science</div>
//     <table> Name | Degree | Options | OUAC Code </table>
//     <div class="o-campus__requirements"> ... <table>
//        <tr><td>English</td><td>ENG4U / EAE4U</td></tr>
//        <tr><td>Physics Recommended</td><td>SPH4U</td></tr>
//        <tr><td>Supplemental Application</td><td>Required</td></tr>
//     </table></div>
//   </div>
// These pages have no admission averages, but each campus block links to a campus
// page ("Learn more about X at U of T Scarborough") that sometimes does:
//   - Scarborough (utsc.utoronto.ca): "Approximate grade requirements" list
//   - Mississauga (utm.utoronto.ca):  "Competitive Average" box
// St. George Arts & Science pages are behind a bot challenge and Engineering
// doesn't publish averages, so those are not fetched. Arts & Science admits by
// admission category instead: each St. George A&S block links to its category page
// (artsci.utoronto.ca/future/ready-apply/admission-categories/<category>), and the
// category ranges below were copied by hand from a browser-saved copy of
// https://www.artsci.utoronto.ca/future/ready-apply/admission-requirements/ontario-high-school
// ("Recommended Admission Range", checked 2026-11-01). Re-check every cycle.

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'toronto'
const BASE = 'https://future.utoronto.ca'

export async function listPrograms(fetchPage) {
  const index = await fetchPage(`${BASE}/sitemap.xml`)
  const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
  const urls = new Set()
  for (const sitemap of sitemaps) {
    const xml = await fetchPage(sitemap)
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (/^https:\/\/future\.utoronto\.ca\/program\/[a-z0-9-]+$/.test(loc)) urls.add(loc)
    }
  }
  return [...urls]
}

const ENGINEERING_FAQ = 'https://discover.engineering.utoronto.ca/faqs/'

/**
 * Runs once before the program pages. St. George Engineering publishes its grade
 * ranges, supplemental application and deadlines on a FAQ page instead of the
 * program pages, so read that first. Failure here is not fatal.
 */
export async function prepare(fetchPage) {
  try {
    return { engineering: parseEngineeringFaq(await fetchPage(ENGINEERING_FAQ)) }
  } catch {
    return {}
  }
}

export function parseEngineeringFaq(html) {
  const $ = load(html)
  // <table> GRADE RANGE | PROGRAMS
  //         Low to Mid 90's | Computer Engineering, Electrical Engineering, Engineering Science
  const ranges = []
  $('table')
    .filter((_, t) => /grade range/i.test($(t).text()))
    .first()
    .find('tr')
    .each((_, tr) => {
      const [averageText, programs] = $(tr)
        .find('td')
        .map((_, td) => cleanText($(td).text()))
        .get()
      if (!programs || /grade range/i.test(averageText)) return
      ranges.push({ averageText, names: programs.split(/\s*,\s*/) })
    })

  const sentences = cleanText($('body').text()).match(/[^.?!]*[.?!]/g) ?? []
  const find = (re) => sentences.map((s) => s.trim()).find((s) => re.test(s))
  const deadline = find(/deadline .*Engineering Supplemental Application.* is (\w+ \d{1,2})/i)
  const early = find(/encouraged to submit .*Engineering Supplemental Application.* by (\w+ \d{1,2})/i)

  const keyDates = []
  if (early) keyDates.push({ label: 'Engineering Supplemental Application — early consideration', on: early.match(/by (\w+ \d{1,2})/i)[1] })
  if (deadline) keyDates.push({ label: 'Engineering Supplemental Application deadline', on: deadline.match(/is (\w+ \d{1,2})/i)[1] })

  return { ranges, supplementarySentence: deadline ?? '', keyDates }
}

// Small edit distance so "Electical Engineering" (a typo on the UofT site) still matches.
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

function engineeringAverage(engineering, name) {
  const target = name.toLowerCase()
  return engineering?.ranges.find((r) => r.names.some((n) => editDistance(n.toLowerCase(), target) <= 2))?.averageText ?? ''
}

export const ARTSCI_CATEGORY_RANGES = {
  'computer-science': 'Low 90s',
  humanities: 'Low to mid 80s',
  'life-sciences': 'Mid to high 80s',
  'physical-mathematical-sciences': 'Mid to high 80s', // "Mathematical & Physical Sciences"
  'rotman-commerce': 'Mid to high 80s',
  'social-sciences': 'Mid to high 80s',
}

/** "https://www.artsci.utoronto.ca/future/ready-apply/admission-categories/humanities" -> "Low to mid 80s" */
export function artsciCategoryAverage(detailUrl) {
  const m = /^https?:\/\/(?:www\.)?artsci\.utoronto\.ca\/future\/ready-apply\/admission-categories\/([a-z-]+)\/?(?:[#?].*)?$/.exec(detailUrl ?? '')
  return (m && ARTSCI_CATEGORY_RANGES[m[1]]) || ''
}

const SUPPLEMENTARY_ROW = /supplement|portfolio|audition|interview|profile|essay|video/i

export function parseProgram(html, url, context = {}) {
  const $ = load(html)
  const name = cleanText($('h1').first().text())
  const description = cleanText($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'))

  return $('.o-campus')
    .map((_, block) => {
      const c = $(block)
      const campusId = c.attr('id') ?? ''
      const campus = cleanText(c.find('h2').first().text()).replace(/\s+campus$/i, '')

      const programRows = c.find('.o-campus__program-items tbody tr')
      const degrees = [...new Set(programRows.map((_, tr) => cleanText($(tr).find('td').eq(1).text())).get().filter(Boolean))]

      const requirementItems = []
      const supplementarySentences = []
      c.find('.o-campus__requirements > .a-table-wrapper tr').each((_, tr) => {
        const [label, value] = $(tr)
          .find('td')
          .map((_, td) => cleanText($(td).text()))
          .get()
        if (!label) return
        if (/recommended/i.test(label) || /recommended/i.test(value ?? '')) return
        if (SUPPLEMENTARY_ROW.test(label)) supplementarySentences.push(`${label}: ${value}`)
        else requirementItems.push(`${label} => ${value ?? ''}`)
      })
      c.find('.o-campus__requirements .s-wysiwyg li').each((_, li) => supplementarySentences.push(cleanText($(li).text())))

      const faculty = cleanText(c.find('.o-campus__subtitle').first().text()) || `U of T ${campus}`
      const isStGeorgeEngineering = campusId === 'campus-utsg' && /engineering/i.test(faculty) && context.engineering
      if (isStGeorgeEngineering && context.engineering.supplementarySentence) {
        supplementarySentences.push(context.engineering.supplementarySentence)
      }

      const detailUrl = c.find('.o-campus__detail-link a').attr('href') ?? ''
      const categoryAverage = campusId === 'campus-utsg' ? artsciCategoryAverage(detailUrl) : ''

      return {
        id: `${id}-${slugify(campus)}-${slugify(name)}`,
        name,
        campus,
        faculty,
        degree: degrees.join(', '),
        requirementItems,
        averageText: isStGeorgeEngineering ? engineeringAverage(context.engineering, name) : categoryAverage,
        keyDates: isStGeorgeEngineering ? context.engineering.keyDates : [],
        supplementarySentences,
        coop: /co-op/i.test(programRows.text()),
        description,
        officialUrl: campusId ? `${url}#${campusId}` : url,
        detailUrl,
      }
    })
    .get()
}

const UTSC = /^(www\.)?utsc\.utoronto\.ca$/
const UTM = /^(www\.)?utm\.utoronto\.ca$/

/** Whether parseDetail knows how to read this campus page. */
export function wantsDetail(detailUrl) {
  try {
    const { host } = new URL(detailUrl)
    return UTSC.test(host) || UTM.test(host)
  } catch {
    return false
  }
}

/**
 * Reads admission averages (and UTSC's per-course minimums) from a campus page.
 * Returns the fields to add to the program, or {} if nothing was found.
 */
export function parseDetail(html, detailUrl) {
  const $ = load(html)
  const { host } = new URL(detailUrl)

  if (UTSC.test(host)) {
    // The first list is for Ontario high school students.
    const heading = $('strong').filter((_, s) => /^approximate grade requirements$/i.test(cleanText($(s).text()))).first()
    const items = heading.nextAll('ul').first().find('li').map((_, li) => cleanText($(li).text())).get()
    const averageText = items.find((t) => /overall|average/i.test(t)) ?? ''
    const minimumNotes = items.filter((t) => /^minimum\s+\d{2}\s*%/i.test(t))
    return averageText || minimumNotes.length ? { averageText, minimumNotes } : {}
  }

  if (UTM.test(host)) {
    const averageText = cleanText($('.field-name-field-approximate-grade-requirem p').first().text())
    return averageText ? { averageText } : {}
  }

  return {}
}
