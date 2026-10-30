// University of Ottawa — https://www.uottawa.ca/study/undergraduate-studies/program-prerequisites
//
// The prerequisites page is a small form backed by a public JSON API:
//   /api/uottawa_art_api/options?type=disciplines&lang=en  -> list of programs (as a JSON-encoded string)
//   /api/uottawa_art_api/render?education_level=1&location=9&discipline=78&lang=en
//       -> an HTML fragment for "High school in Canada" + "Ontario":
//   <div class="art-render__program-name"><p>Honours BSc Computer Science (BSc)</p></div>
//   <h3>Prerequisite courses and requirements</h3><div class="rich-text"><ul><li>Advanced Functions 4U (MHF4U)</li>...</ul></div>
//   <h3>Notes</h3><p>A minimum combined average of 70% is required ...</p>
//   <div class="eyebrow">Faculty</div><p><strong>Engineering</strong></p>
//   <div class="eyebrow">Minimum admission average</div><p><strong><p>80%</p></strong></p>
//   <div class="eyebrow">Streams</div> ... <li>Co-operative Education ...</li>

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'ottawa'
const API = 'https://www.uottawa.ca/api/uottawa_art_api'
const HIGH_SCHOOL_IN_CANADA = 1
const ONTARIO = 9
const PREREQUISITES_PAGE = 'https://www.uottawa.ca/study/undergraduate-studies/program-prerequisites'

/** The API returns JSON whose value is itself a JSON string: "[{\"78\":\"Computer Science\",...}]". */
export function parseOptions(text) {
  let value = JSON.parse(text)
  if (typeof value === 'string') value = JSON.parse(value)
  return value.map((option) => {
    const [key, label] = Object.entries(option).find(([k]) => k !== 'text')
    return { id: key, label }
  })
}

export async function listPrograms(fetchPage) {
  const disciplines = parseOptions(await fetchPage(`${API}/options?type=disciplines&lang=en`))
  // The program's name from the list ("Computer Science") is cleaner than the page's title
  // ("Honours BSc Computer Science"), so it travels along in the hash (never sent to the server).
  return disciplines
    .filter((d) => !/certificate/i.test(d.label)) // certificates aren't OUAC 101 degree programs
    .map(
      (d) =>
        `${API}/render?education_level=${HIGH_SCHOOL_IN_CANADA}&location=${ONTARIO}&discipline=${d.id}&lang=en#${encodeURIComponent(d.label)}`,
    )
}

/** "Honours BSc Computer Science" -> "BSc"; "Honours Bachelor of Commerce in Accounting" -> "Bachelor of Commerce" */
export function degreeFrom(title) {
  return (
    title.match(/\b(B[A-Z][A-Za-z]{0,6}|LL\.L)\b/)?.[1] ??
    title.match(/\b(Bachelor of [A-Z][a-z]+(?: (?!Honours)[A-Z][a-z]+)?)/)?.[1] ??
    title.match(/\b(Baccalauréat (?:ès sciences )?spécialisé)/)?.[1] ??
    ''
  )
}

export function parseProgram(html, url) {
  const $ = load(html)
  const title = cleanText($('.art-render__program-name p').first().text())
  if (!title) return []

  // Sidebar items: <div class="event-detail__sidebar--item"><div class="eyebrow">Faculty</div><p>...</p></div>
  const sidebarItem = (label) => $('.eyebrow').filter((_, e) => new RegExp(label, 'i').test($(e).text())).first().parent()
  const sidebar = (label) => cleanText(sidebarItem(label).clone().find('.eyebrow').remove().end().text())
  const sectionAfter = (label) =>
    $('h3')
      .filter((_, h) => new RegExp(label, 'i').test(cleanText($(h).text())))
      .first()
      .nextUntil('h3')

  const prereqs = sectionAfter('^prerequisite')
  const requirementItems = prereqs.find('li').length
    ? prereqs.find('li').map((_, li) => cleanText($(li).text())).get()
    : [cleanText(prereqs.text())].filter(Boolean)
  const notes = sectionAfter('^notes$').map((_, el) => cleanText($(el).text())).get()
  const about = sectionAfter('^about this program$').map((_, el) => cleanText($(el).text())).get()
  const faculty = sidebar('^faculty$')
  const name = decodeURIComponent(new URL(url).hash.slice(1)) || title

  return [
    {
      id: `${id}-${slugify(name)}`,
      name,
      faculty: faculty ? `Faculty of ${faculty}` : '',
      degree: degreeFrom(title),
      requirementItems,
      averageText: sidebar('admission average'),
      supplementarySentences: [...about, ...notes].filter(Boolean),
      coop: /co-?operative education/i.test(sidebar('^streams$')),
      description: title,
      officialUrl: PREREQUISITES_PAGE,
    },
  ]
}
