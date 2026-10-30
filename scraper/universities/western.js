// Western University — https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/<name>.html
//
// <h2 class="card-title">Admission Requirements</h2>
// <div class="card-text">
//   <h4>Ontario High School (Group A)</h4>
//   <ul>
//     <li>Required Courses: <ul><li>English (ENG4U)</li><li>And one of: ...</li></ul></li>
//     <li>Admission Average Guideline: <strong>Low to mid 80s</strong> <ul>...</ul></li>
//     <li>For Western Integrated Science (WISc), ... supplemental application.</li>
//   </ul>
// </div>

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'western'
const BASE = 'https://welcome.uwo.ca'

export async function listPrograms(fetchPage) {
  const xml = await fetchPage(`${BASE}/sitemap.xml`)
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((loc) => /\/what-can-i-study\/undergraduate-programs\/(?!index\.html)[a-z0-9-]+\.html$/.test(loc))
}

export function parseProgram(html, url) {
  const $ = load(html)
  const title = $('h2.card-title').filter((_, h) => /admission requirements/i.test($(h).text()))
  if (title.length === 0) return [] // e.g. Ivey, which uses a different admission process

  const ontario = title
    .first()
    .parent()
    .find('h4')
    .filter((_, h) => /ontario/i.test($(h).text()))
    .first()
  const list = ontario.nextAll('ul').first()
  if (list.length === 0) return []

  const requirementItems = []
  const supplementarySentences = []
  let averageText = ''

  list.children('li').each((_, li) => {
    const item = $(li)
    const ownText = cleanText(item.clone().children('ul').remove().end().text())
    if (/^required courses/i.test(ownText)) {
      item.find('> ul > li').each((_, sub) => requirementItems.push(cleanText($(sub).text())))
    } else if (/admission average/i.test(ownText)) {
      averageText = cleanText(item.find('strong').first().text()) || ownText.replace(/^admission average guideline:?\s*/i, '')
    } else {
      supplementarySentences.push(ownText)
    }
  })

  const name = cleanText($('h1').first().text())
  return [
    {
      id: `${id}-${slugify(name)}`,
      name,
      requirementItems,
      averageText,
      supplementarySentences,
      coop: $('h2, h3').filter((_, h) => /co-op/i.test($(h).text())).length > 0,
      description: cleanText($('meta[name="description"]').attr('content')),
      officialUrl: url,
    },
  ]
}
