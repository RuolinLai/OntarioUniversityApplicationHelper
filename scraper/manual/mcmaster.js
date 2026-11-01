// McMaster University — parsed from pages the developer saved in a browser, never fetched.
//
// McMaster's robots.txt blocks AI agents (ClaudeBot, Claude-Web, ChatGPT-User, …), so this is
// deliberately NOT a scraper adapter: run.js never loads it. Instead, open
// https://future.mcmaster.ca/apply/requirements/ (Attending a Canadian secondary school → Ontario),
// compare two programs at a time, save each result page (Ctrl+S, "Webpage, Complete") into one
// folder, and run:  node scraper/tools/import-mcmaster.js <folder>
//
// Program pages can't be linked directly (the tool ignores ids in the URL), so officialUrl is the tool itself.
//
// Each program is one table in #admission_requirements:
//   <div class="col" id="program-1"><table><tbody>
//     <tr><th>Program + degree</th><td>Engineering + B.Eng., B.Eng.Mgt.</td></tr>
//     <tr><th>Anticipated Admission Range:</th><td>min. 87%</td></tr>
//     <tr><th colspan="2">Required Courses:</th></tr>
//     <tr><td colspan="2"><p>… including:</p><ul><li>ENG4U</li>…</ul> Important Notes: <ul>…</ul></td></tr>
//     <tr><th>Application Deadline:</th><td>January 15, 2027. Recommended Early Application Submission: …</td></tr>
//     <tr><th>Supplementary Application Deadline:</th><td>January 28, 2027 at 11:59 p.m. ET. …</td></tr>
//     <tr><th>Co-op/Internship:</th><td>Mandatory Co-op</td></tr>
//   </tbody></table></div>

import { load } from 'cheerio'
import { buildPrerequisites, classifyFields, cleanText, parseAdmissionRange, slugify } from '../normalize.js'

const BASE = 'https://future.mcmaster.ca/apply/requirements/'

// classifyFields guesses from words in the name; these names don't say enough.
const FIELDS = {
  'Bachelor of Technology': ['Engineering'],
  'Chemical and Physical Sciences Gateway': ['Physical Sciences / Environment'],
  'Honours Integrated Science': ['Physical Sciences / Environment', 'Life Sciences / Health'],
  'iArts (Integrated Arts) I': ['Arts / Design'],
  Midwifery: ['Life Sciences / Health'],
}

const MONTH_DAY_YEAR = String.raw`(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,?\s+)?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})`

/** "January 28, 2027" -> "2027-01-28" */
// Strict on purpose: new Date() happily reads "Early/mid-February 2027" as February 1.
export function toIsoDate(text) {
  const m = (text ?? '').trim().match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/)
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1
  if (month < 0) return null
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']


// Reads every program table into { 'Program + degree': text, 'Required Courses:': { html }, … }.
function readTable($, col) {
  const rows = {}
  let heading = null
  $(col)
    .find('table > tbody > tr')
    .each((_, tr) => {
      const th = $(tr).children('th')
      const td = $(tr).children('td')
      if (th.length && td.length) rows[cleanText(th.text())] = { text: cleanText(td.text()), html: td.html() }
      else if (th.length) heading = cleanText(th.text())
      else if (td.length && heading) {
        rows[heading] = { text: cleanText(td.text()), html: td.html() }
        heading = null
      }
    })
  return rows
}

// Course list before "Important Notes", notes after it. "SBI 4U" is written with a space sometimes.
function splitRequirements(html) {
  const [before, after = ''] = (html ?? '').split(/Important Notes:?/i)
  const items = (part) => {
    const $ = load(part)
    return $('li')
      .map((_, li) => cleanText($(li).text()).replace(/\b([A-Z]{3})\s+(4[UM])\b/g, '$1$2'))
      .get()
      .filter(Boolean)
  }
  const noteItems = items(after)
  const noteText = cleanText(load(after).text())
  return { items: items(before), notes: noteItems.length ? noteItems : noteText ? [noteText] : [] }
}

// Requirement list items that are really notes ("MCV4U is recommended", long explanations).
// iBioMed lists its OUAC tracks there too, and Arts & Science says "Two of the four remaining
// credits must be at the U level" (not a course).
const isNote = (text) =>
  text.length > 160 ||
  /\brecommended\b/i.test(text) ||
  // "Students without calculus will be required to take calculus in Level I" mentions a course but isn't one.
  /^(applicants?|students?|please submit)\b/i.test(text) ||
  /\btrack\b/i.test(text) ||
  /\bremaining credits\b/i.test(text)

/**
 * Dates in the Application / Supplementary rows. The date at the start of a cell is that row's
 * deadline; "Recommended Early … Submission: <date>" phrases get their own label, wherever they are
 * (McMaster's Bachelor of Technology table has them in each other's rows).
 */
export function parseDates(application, supplementary) {
  const dates = []
  const add = (label, text) => {
    const date = toIsoDate(text)
    if (date && !dates.some((d) => d.date === date)) dates.push({ label, date })
  }
  const early = new RegExp(String.raw`Recommended Early (Supplementary )?Application Submission:?\s*${MONTH_DAY_YEAR}`, 'gi')
  for (const text of [application, supplementary]) {
    for (const m of (text ?? '').matchAll(early)) {
      add(m[1] ? 'McMaster: recommended early supplementary application' : 'McMaster: recommended early application', m[2])
    }
  }
  // Nursing: "Current Ontario high school students (OUAC Group A): January 15, 2027 All other …"
  const groupA = application?.match(new RegExp(String.raw`Group A\):?\s*${MONTH_DAY_YEAR}`, 'i'))
  const appStart = application?.match(new RegExp(`^${MONTH_DAY_YEAR}`, 'i'))
  if (groupA ?? appStart) add('McMaster application deadline', (groupA ?? appStart)[1])

  const suppStart = supplementary?.match(new RegExp(`^${MONTH_DAY_YEAR}`, 'i'))
  const optional = supplementary?.match(new RegExp(String.raw`optional supplement\w* application deadline:?\s*${MONTH_DAY_YEAR}`, 'i'))
  // Midwifery: "You must complete the Identity and Admissions Survey by February 1, 2027."
  const by = supplementary?.match(new RegExp(String.raw`(?:complete (?:the )?(.+?)\s+)?\bby\s+${MONTH_DAY_YEAR}`, 'i'))
  if (suppStart) add('McMaster supplementary application deadline', suppStart[1])
  else if (optional) add('McMaster optional supplementary application deadline', optional[1])
  else if (by) add(by[1] ? `McMaster ${by[1]} due` : 'McMaster supplementary requirement due', by[2])
  return dates.sort((a, b) => a.date.localeCompare(b.date))
}

function parseSupplementary(suppText, averageText) {
  const text = cleanText((suppText ?? '').replace(/\b(Apply|Learn more|\(more information\))\s*$/i, ''))
  const interview = /\binterview/i.test(`${text} ${averageText}`)
  if (!text && !interview) return { required: false, type: '', rawText: '' }
  // Business: "Optional supplemental application deadline: April 30, 2027…" isn't required.
  if (/\boptional\b/i.test(text)) return { required: false, type: '', rawText: text }
  const types = []
  if (/casper/i.test(`${text} ${averageText}`)) types.push('Casper test')
  else if (text) types.push('Supplementary application')
  if (interview) types.push('Interview')
  return { required: true, type: types.join(' + '), rawText: [text, interview ? averageText : ''].filter(Boolean).join(' ') }
}

// "Min. 85% … mid-high 80s" -> the published minimum is the real bottom of the range.
function parseRange(text) {
  const range = parseAdmissionRange(text)
  const min = text.match(/\bmin(?:imum)?\.?\s*(\d{2})\s*%/i)
  if (range && min && range.high != null) range.low = Math.max(range.low, Number(min[1]))
  return range
}

const coopFrom = (text) => /co-?op/i.test(text) && !/^no\b|not available/i.test(text)

/**
 * All programs on one saved page. Returns [{ program, warnings }].
 * @param {string} html     the saved page
 * @param {string} synced   "YYYY-MM-DD" the page was saved
 */
export function parseSavedPage(html, synced) {
  const $ = load(html)
  return $('#admission_requirements > div.col')
    .map((_, col) => {
      const rows = readTable($, col)
      const title = rows['Program + degree']?.text
      if (!title) return null
      const [name, ...degree] = title.split(' + ')
      const warnings = []

      const { items, notes } = splitRequirements(rows['Required Courses:']?.html)
      const courseItems = items.filter((t) => !isNote(t))
      const prerequisites = buildPrerequisites(courseItems)
      warnings.push(...prerequisites.warnings)
      delete prerequisites.warnings
      // Midwifery: "Applicants must obtain a minimum grade of 85% in each of the required courses"
      const eachMin = [...items, ...notes].join(' ').match(/minimum grade of (\d{2})\s*% in each of the required courses/i)
      if (eachMin) for (const c of prerequisites.required) prerequisites.minimums[c] = Number(eachMin[1])
      const recommended = [...items, ...notes].filter((t) => /\brecommended\b/i.test(t) && t.length <= 200)
      if (recommended.length) prerequisites.rawText += ` (Notes: ${recommended.join(' ')})`

      const averageText = rows['Anticipated Admission Range:']?.text ?? ''
      const range = parseRange(averageText)
      if (!range) warnings.push(`Could not parse admission range: "${averageText}"`)

      const application = rows['Application Deadline:']?.text
      const suppText = rows['Supplementary Application Deadline:']?.text
      const keyDates = parseDates(application, suppText)
      if (suppText && !new RegExp(MONTH_DAY_YEAR, 'i').test(suppText)) warnings.push(`No exact supplementary date: "${suppText.slice(0, 80)}"`)


      return {
        program: {
          id: `mcmaster-${slugify(name)}`,
          name,
          universityId: 'mcmaster',
          campus: '',
          faculty: '',
          field: FIELDS[name] ?? classifyFields(name),
          degree: degree.join(' + '),
          prerequisites,
          admissionRange: { low: range?.low ?? null, high: range?.high ?? null, rawText: averageText },
          supplementary: parseSupplementary(suppText, averageText),
          keyDates,
          coop: coopFrom(rows['Co-op/Internship:']?.text ?? ''),
          // Links with program ids don't open the results, so link the tool; students pick the program there.
          officialUrl: BASE,
          description: '',
          source: 'manual',
          lastSynced: synced,
          // A missing date isn't a reason to stop checking eligibility; unread courses or ranges are.
          needsReview: warnings.some((w) => !w.startsWith('No exact supplementary date')),
        },
        warnings,
      }
    })
    .get()
    .filter(Boolean)
}
