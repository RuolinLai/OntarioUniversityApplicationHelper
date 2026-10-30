// University of Waterloo — https://uwaterloo.ca/future-students/programs
//
// Each program page has an "<Program> admission requirements" section:
//   <h3>Ontario students</h3>
//   <p>Six Grade 12 U and/or M courses including</p>
//   <ul><li>Advanced Functions (minimum final grade of 70% is required)</li>...</ul>
//   <p>Admission average: Individual selection from the low to mid-90s</p>
//   <h4>Recommended courses</h4> ...
//   <h3>For all students</h3>
//   <ul><li>The Admission Information Form is required for admission.</li></ul>

import { load } from 'cheerio'
import { cleanText, slugify, parseAdmissionRange } from '../normalize.js'

export const id = 'waterloo'
const BASE = 'https://uwaterloo.ca'
const LIST_URL = `${BASE}/future-students/programs`

export async function listPrograms(fetchPage) {
  const $ = load(await fetchPage(LIST_URL))
  const urls = new Set()
  $('a[href]').each((_, a) => {
    const url = new URL($(a).attr('href'), BASE)
    url.hash = ''
    url.search = ''
    const path = url.pathname.replace(/\/$/, '')
    if (url.host === 'uwaterloo.ca' && /^\/future-students\/programs\/[a-z0-9-]+$/.test(path)) urls.add(BASE + path)
  })
  return [...urls]
}

function sectionAfter($, heading) {
  // All siblings after a heading, up to the next h2/h3.
  const out = []
  let el = $(heading).next()
  while (el.length && !/^h[23]$/.test(el[0].tagName)) {
    out.push(el)
    el = el.next()
  }
  return out
}

const textsOf = ($, el) =>
  el.is('ul, ol') ? el.find('li').map((_, li) => cleanText($(li).text())).get() : [cleanText(el.text())]

export function parseProgram(html, url) {
  const $ = load(html)
  const headings = $('h3').filter((_, h) => /^ontario students$/i.test(cleanText($(h).text())))
  if (headings.length === 0) return [] // not a program page (e.g. "Minors", "By faculty")

  const requirementItems = []
  const averageParts = []
  const otherSentences = []
  let mode = 'start' // start -> courses -> average -> recommended

  for (const el of sectionAfter($, headings.first())) {
    const text = cleanText(el.text())
    if (el.is('h4') && /recommended/i.test(text)) mode = 'recommended'
    else if (/admission average/i.test(text)) {
      mode = 'average'
      averageParts.push(text.replace(/^admission averages?:?\s*/i, ''))
    } else if (mode === 'start' && el.is('ul')) {
      requirementItems.push(...textsOf($, el))
      mode = 'courses'
    } else if (mode === 'average' && !(el.is('p') && parseAdmissionRange(averageParts.join(' ')))) {
      // Keep collecting until we have a range, e.g. "Individual selection from the" + <ul>mid-80s ...</ul>
      averageParts.push(...textsOf($, el))
    } else if (mode !== 'recommended') {
      // Anything after the average, like "Selected students will be invited to submit a portfolio".
      if (mode === 'average') mode = 'after'
      otherSentences.push(...textsOf($, el))
    }
  }

  const forAll = $('h3').filter((_, h) => /^for all students$/i.test(cleanText($(h).text())))
  if (forAll.length) for (const el of sectionAfter($, forAll.first())) otherSentences.push(...textsOf($, el))

  const name = cleanText($('h1').first().text()).replace(/\s+(degree|degrees|program)$/i, '')
  const mainText = cleanText($('main').text() || $('body').text())
  const faculty =
    mainText.match(/contact (?:our|the) (Faculty of \w+)/i)?.[1] ?? mainText.match(/\bFaculty of (Arts|Engineering|Environment|Health|Mathematics|Science)\b/)?.[0] ?? ''

  return [
    {
      id: `${id}-${slugify(name)}`,
      name,
      faculty,
      requirementItems,
      averageText: cleanText(averageParts.join(' ')),
      supplementarySentences: otherSentences,
      coop: $('h2').filter((_, h) => /co-op/i.test($(h).text())).length > 0,
      description: cleanText($('meta[name="description"]').attr('content')),
      officialUrl: url,
    },
  ]
}
