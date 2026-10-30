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
// UofT does not publish admission averages on these pages.

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

const SUPPLEMENTARY_ROW = /supplement|portfolio|audition|interview|profile|essay|video/i

export function parseProgram(html, url) {
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

      return {
        id: `${id}-${slugify(campus)}-${slugify(name)}`,
        name,
        campus,
        faculty: cleanText(c.find('.o-campus__subtitle').first().text()) || `U of T ${campus}`,
        degree: degrees.join(', '),
        requirementItems,
        averageText: '',
        supplementarySentences,
        coop: /co-op/i.test(programRows.text()),
        description,
        officialUrl: campusId ? `${url}#${campusId}` : url,
      }
    })
    .get()
}
