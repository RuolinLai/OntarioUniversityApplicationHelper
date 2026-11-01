// Western University — https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/<name>.html
//
// Single-entry pages:
// <h2 class="card-title">Admission Requirements</h2>
// <div class="card-text">
//   <h4>Ontario High School (Group A)</h4>
//   <ul>
//     <li>Required Courses: <ul><li>English (ENG4U)</li><li>And one of: ...</li></ul></li>
//     <li>Admission Average Guideline: <strong>Low to mid 80s</strong> <ul>...</ul></li>
//     <li>For Western Integrated Science (WISc), ... supplemental application.</li>
//   </ul>
// </div>
//
// Pages with several entry points (Music, Nursing, Arts & Humanities) put each one in a tab:
// <nav class="tab-container">
//   <button class="tab-button">Bachelor of Music (BMus)</button> ...
//   <div class="tab-pane"><p><strong>OUAC Code = EM</strong></p><h4>Ontario High School (Group A) Requirements</h4><ul>...</ul></div>
// </nav>
// The same tabs are repeated as an accordion for phones; only the <nav> copy is read.

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

/** Reads the <ul> that follows an "Ontario High School" heading inside `scope`. */
function parseRequirements($, scope) {
  const ontario = scope
    .find('h4')
    .filter((_, h) => /ontario/i.test($(h).text()))
    .first()
  const list = ontario.nextAll('ul').first()
  if (list.length === 0) return null

  const requirementItems = []
  const supplementarySentences = []
  let averageText = ''

  list.children('li').each((_, li) => {
    const item = $(li)
    const ownText = cleanText(item.clone().children('ul').remove().end().text())
    if (/^required courses/i.test(ownText)) {
      item.find('> ul > li').each((_, sub) => requirementItems.push(cleanText($(sub).text())))
    } else if (/average guideline/i.test(ownText)) {
      averageText = cleanText(item.find('strong').first().text()) || ownText.replace(/^(admission )?average guideline:?\s*/i, '')
    } else if (/^required admission process/i.test(ownText)) {
      // "Required Admission Process: <ul><li>Audition and Interview</li><li>Questionnaire</li></ul>"
      const steps = item.find('> ul > li').map((_, sub) => cleanText($(sub).text())).get()
      supplementarySentences.push(`${ownText} ${steps.join('; ')}`.trim())
    } else {
      supplementarySentences.push(ownText)
    }
  })
  return { requirementItems, averageText, supplementarySentences }
}

export function parseProgram(html, url) {
  const $ = load(html)
  const pageName = cleanText($('h1').first().text())
  const common = {
    coop: $('h2, h3').filter((_, h) => /co-op/i.test($(h).text())).length > 0,
    description: cleanText($('meta[name="description"]').attr('content')),
    officialUrl: url,
  }

  const title = $('h2.card-title').filter((_, h) => /admission requirements/i.test($(h).text()))
  if (title.length > 0) {
    const parsed = parseRequirements($, title.first().parent())
    return parsed ? [{ id: `${id}-${slugify(pageName)}`, name: pageName, ...parsed, ...common }] : []
  }

  // Tabbed entry points. Panes without Ontario high school requirements (e.g. Nursing's
  // compressed BScN, which needs university credits) are skipped.
  const nav = $('nav.tab-container')
    .filter((_, n) => $(n).find('h4').filter((_, h) => /ontario high school/i.test($(h).text())).length > 0)
    .first()
  if (nav.length === 0) return [] // e.g. Ivey, which uses a different admission process
  const labels = nav.find('button.tab-button').map((_, b) => cleanText($(b).text())).get()
  const programs = []
  nav.find('.tab-pane').each((i, pane) => {
    const parsed = parseRequirements($, $(pane))
    const label = labels[i]
    if (!parsed || !label) return
    const name = label.toLowerCase().startsWith(pageName.toLowerCase()) ? label : `${pageName}: ${label}`
    programs.push({ id: `${id}-${slugify(name)}`, name, ...parsed, ...common })
  })
  return programs
}
