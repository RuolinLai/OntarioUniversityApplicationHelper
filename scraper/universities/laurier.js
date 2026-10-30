// Wilfrid Laurier University — https://www.wlu.ca/programs/<faculty>/undergraduate/<name>/index.html
//
// Program pages are listed in the sitemap. Each has an accordion:
//   <h3 class="accordion-header">What Are the Ontario High School Admission Requirements?</h3>
//   <div> <strong>BA requirements</strong>
//     <ul><li>Average admission range: high 70s</li><li>English at 60%</li><li>Advanced Functions at 60%</li>
//         <li>All prerequisite courses calculated in admissions average</li></ul>
//     <p><strong>BSc requirements</strong></p><ul>...</ul></div>
// Pages with one degree have a single list and no "X requirements" label.

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'laurier'
const BASE = 'https://www.wlu.ca'
const CAMPUSES = { waterloo: 'Waterloo', brantford: 'Brantford', milton: 'Milton' }

export async function listPrograms(fetchPage) {
  const xml = await fetchPage(`${BASE}/sitemap.xml`)
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https:\/\/wlu\.ca/, BASE))
    .filter((loc) => /\/programs\/[a-z-]+\/undergraduate\/[a-z0-9-]+\/index\.html$/.test(loc))
}

/** "English at 60%" -> "English (minimum grade of 60%)" */
export function rewriteItem(text) {
  return text.replace(/\s+at\s+(\d{2})\s*%/i, ' (minimum grade of $1%)')
}

/** Some programs exist on two campuses with the same URL name, so the campus goes in the id. */
function programId(base, campus) {
  const slug = slugify(base)
  const suffix = slugify(campus)
  return `${id}-${slug}${suffix && !slug.includes(suffix) ? '-' + suffix : ''}`
}

export function parseProgram(html, url) {
  const $ = load(html)
  const heading = $('h3')
    .filter((_, h) => /ontario high school admission requirements/i.test($(h).text()))
    .first()
  if (!heading.length) return []
  const panel = heading.next()

  const slug = url.match(/\/undergraduate\/([a-z0-9-]+)\/index\.html$/)?.[1] ?? slugify(cleanText($('h1').text()))
  // "This program is offered on our Waterloo campus." (in the OUAC accordion)
  const offeredOn = $('body').text().match(/offered on our (\w+) campus/i)?.[1]?.toLowerCase()
  const campus = CAMPUSES[offeredOn] ?? CAMPUSES[slug.split('-').pop()] ?? ''
  // "Computer Science (BA or BSc)" -> "Computer Science"; the degree comes from each list's label.
  const title = cleanText($('h1').first().text())
  const name = cleanText(title.replace(/\((?:[^()]*\b(?:BA|BSc|BBA|BMus|BEd|BSW|or)\b[^()]*)\)\s*$/, '')) || title
  const experience = $('h3')
    .filter((_, h) => /real-world experience/i.test($(h).text()))
    .first()
    .nextUntil('h2, h3')
    .text()
  const coop = /\bco-?op\b/i.test(experience)
  const description = cleanText($('meta[name="description"]').attr('content'))

  const lists = panel.find('ul')
  const programs = lists
    .map((_, ul) => {
      // The label is the <strong> just before this list: a degree ("BA requirements") or,
      // on pages for combined programs, a program ("History (BA) and Law (LLB):").
      const label = cleanText(
        $(ul)
          .prevAll('strong, p')
          .first()
          .text()
          .replace(/\s*requirements?\s*:?\s*$/i, '')
          .replace(/:\s*$/, ''),
      )
      const separate = lists.length > 1 && label
      const degree = separate && /^[A-Za-z]{2,6}$/.test(label) ? label : ''
      // A label like "History (BA) and Law (LLB)" names the program; one like
      // "Medical Foundation Partnership Minor" is an option of this page's program.
      const variant = separate && !degree ? label : ''
      const ownsName = variant && slugify(variant).startsWith(slugify(name))
      const programName = !variant ? name : ownsName ? variant : `${name}: ${variant}`
      const items = $(ul)
        .find('li')
        .map((_, li) => cleanText($(li).text()))
        .get()
      const average = items.find((t) => /admission range|admission average/i.test(t)) ?? ''
      const requirementItems = items
        .filter((t) => t !== average && !/calculated in (the )?admissions? average/i.test(t))
        .map(rewriteItem)
      return {
        id: programId(degree ? `${slug} ${degree}` : ownsName ? variant : variant ? `${slug} ${variant}` : slug, campus),
        name: programName,
        campus,
        degree,
        requirementItems,
        averageText: average.replace(/^.*?:\s*/, ''),
        supplementarySentences: [],
        coop,
        description,
        officialUrl: url,
      }
    })
    .get()
  return programs
}
