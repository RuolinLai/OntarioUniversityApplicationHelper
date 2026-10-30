// Carleton University — https://admissions.carleton.ca/applicant-type/current-ontario-high-school-students-2/
//
// Requirements are listed per degree (BCS, BEng, BSc, ...), not per major. The
// applicant page has a "Select your program" form; after choosing, the site
// remembers the choice in the apply_type / apply_program cookies and the same
// page then shows:
//   <h2>Specific Requirements</h2><h3>Computer Science (BCS)</h3>
//   <table class="cutable"> ... <th>Required Courses</th> ... <ul><li>Advanced Functions</li>...</ul>
//   <h4>Program Information</h4><a href=".../programs/computer-science/">Computer Science (BCS)</a>
//   <h5>Cut off Range:</h5><div><p>80-85%</p></div>
// So we send the same cookies a browser would after submitting the form.

import { load } from 'cheerio'
import { cleanText, slugify } from '../normalize.js'

export const id = 'carleton'
const APPLICANT_URL = 'https://admissions.carleton.ca/applicant-type/current-ontario-high-school-students-2/'
const ONTARIO_HIGH_SCHOOL = 1252

export async function listPrograms(fetchPage) {
  const $ = load(await fetchPage(APPLICANT_URL))
  const ids = new Set()
  $('select[name="apply_program"] option[value]').each((_, o) => {
    const value = $(o).attr('value')
    if (/^\d+$/.test(value)) ids.add(value)
  })
  // The hash keeps one cache entry per program; it's never sent to the server.
  return [...ids].map((programId) => `${APPLICANT_URL}#program-${programId}`)
}

export function fetchProgram(url, fetchPage) {
  const programId = url.match(/#program-(\d+)$/)[1]
  return fetchPage(url, { headers: { Cookie: `apply_type=${ONTARIO_HIGH_SCHOOL}; apply_program=${programId}` } })
}

/** "Computer Science (BCS)" -> { name: "Computer Science", degree: "BCS" } */
export function splitDegree(title) {
  // The last short "(B...)" — "Commerce (Business) (BCom)" has a word in brackets too.
  const m = [...title.matchAll(/\((B[A-Za-z]{1,6})\)/g)].pop()
  if (!m) return { name: title, degree: '' }
  return { name: cleanText(title.replace(m[0], '').replace(/\(\s*\)/g, '')), degree: m[1] }
}

export function parseProgram(html, url) {
  const $ = load(html)
  const heading = $('h2').filter((_, h) => /specific requirements/i.test($(h).text()))
  const title = cleanText(heading.nextAll('h3').first().text())
  if (!title) return []

  const table = heading.nextAll('table').first()
  const requirementItems = []
  const supplementarySentences = []
  // Header cells are usually <th>, but some pages use <td> inside <thead>.
  const headers = table.find('thead tr').first().children()
  headers.each((col, th) => {
    const label = cleanText($(th).text())
    const cell = table.find('tbody tr').first().children('td').eq(col)
    const items = cell.find('li').length
      ? cell.find('li').map((_, li) => cleanText($(li).text())).get()
      : [cleanText(cell.text())].filter(Boolean)
    if (/required courses/i.test(label)) requirementItems.push(...items)
    else supplementarySentences.push(...items)
  })

  const info = $('h4').filter((_, h) => /program information/i.test($(h).text())).first().parent()
  const cutoff = info.find('h5').filter((_, h) => /cut ?off/i.test($(h).text())).first()
  const { name, degree } = splitDegree(title)

  return [
    {
      id: `${id}-${slugify(name)}`,
      name,
      degree,
      requirementItems,
      averageText: cleanText(cutoff.next().text()),
      supplementarySentences,
      coop: false,
      description: '',
      officialUrl: info.find('a[href*="/programs/"]').first().attr('href') ?? APPLICANT_URL.replace(/#.*/, ''),
    },
  ]
}
