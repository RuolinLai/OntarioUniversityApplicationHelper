// Turns the text scraped from university websites into the structured
// fields the website uses (course codes, admission ranges, fields of study).
// Everything here is a pure function so it can be unit tested.

import courses from '../src/data/courses.json' with { type: 'json' }

const COURSE_CODE = /\b[A-Z]{3}4[UM]\b/g
const MATH_COURSES = ['MHF4U', 'MCV4U', 'MDM4U']
const ENGLISH_EQUIVALENTS = ['ENG4U', 'EAE4U']

// Course names as they appear on university websites -> course code.
// Built from courses.json (name + aliases), longest first so that
// "Calculus and Vectors" wins over "Calculus".
const NAME_PATTERNS = courses
  .flatMap((c) => [c.name, ...c.aliases].map((name) => ({ name, code: c.code })))
  .sort((a, b) => b.name.length - a.name.length)
  .map(({ name, code }) => ({
    code,
    regex: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i'),
  }))

const COUNT_WORDS = { one: 1, two: 2, three: 3, four: 4 }

/** Finds course codes and course names in a piece of text, in order of appearance. */
export function findCourses(text) {
  const found = []
  // Explicit codes like "English (ENG4U)"
  for (const m of text.matchAll(COURSE_CODE)) found.push({ code: m[0], index: m.index })
  // Course names. Blank out each match so "Calculus" can't match again inside "Calculus and Vectors".
  let remaining = text
  for (const { code, regex } of NAME_PATTERNS) {
    const m = remaining.match(regex)
    if (m) {
      found.push({ code, index: m.index })
      remaining = remaining.slice(0, m.index) + ' '.repeat(m[0].length) + remaining.slice(m.index + m[0].length)
    }
  }
  found.sort((a, b) => a.index - b.index)
  return [...new Set(found.map((f) => f.code))]
}

/**
 * Parses one requirement line, e.g.
 *   "Advanced Functions (minimum final grade of 70% is required)"
 *   "Any two of Biology, Chemistry, and Physics"
 *   "English => ENG4U / EAE4U"
 * Returns { kind: 'required' | 'choose' | 'ignored', courses, count, minimum }.
 */
export function parseRequirementItem(text) {
  const minMatch = text.match(/minimum (?:final )?grade of (?:at least )?(\d{2})\s*%/i)
  const minimum = minMatch ? Number(minMatch[1]) : null

  let found = /\b(?:any|one) (?:grade 12 u |4u )?math(?:ematics)?\b/i.test(text) ? MATH_COURSES : findCourses(text)
  if (found.length === 0) {
    // Grade 11 requirements like "Functions (MCF3M or MCR3U)" are out of scope for a Grade 12 planner.
    const grade11 = /\b[A-Z]{3}3[UMCE]\b/.test(text)
    return { kind: 'ignored', courses: [], count: 0, minimum, grade11 }
  }

  const countMatch = text.match(/\b(one|two|three|four)\b(?:\s+\w+)?\s+of\b/i) || text.match(/\bone math\b/i)
  let count = null
  if (countMatch) count = COUNT_WORDS[(countMatch[1] ?? 'one').toLowerCase()]
  else if (found.length > 1 && /\bor\b|\//i.test(text)) count = 1
  if (MATH_COURSES === found) count = 1

  if (count && count < found.length) return { kind: 'choose', courses: [...found], count, minimum }
  return { kind: 'required', courses: [...found], count: found.length, minimum }
}

/** Combines several requirement lines into the prerequisites object used by the website. */
export function buildPrerequisites(items) {
  const required = []
  const choose = []
  const minimums = {}
  const warnings = []

  for (const text of items) {
    const parsed = parseRequirementItem(text)
    if (parsed.kind === 'ignored') {
      // "One other 4U course" is fine to ignore; anything else might be a course we don't recognise.
      if (!parsed.grade11 && !/\b(other|additional|any)\b.*\b(4U|U\/M|course)/i.test(text)) warnings.push(`Unrecognised requirement: "${text}"`)
      continue
    }
    // EAE4U is an alternative Grade 12 English credit that universities accept in place of
    // ENG4U, so "ENG4U / EAE4U" is simply "English".
    if (parsed.kind === 'choose' && parsed.count === 1 && parsed.courses.every((c) => ENGLISH_EQUIVALENTS.includes(c))) {
      parsed.kind = 'required'
      parsed.courses = ['ENG4U']
    }
    if (parsed.kind === 'required') {
      for (const c of parsed.courses) if (!required.includes(c)) required.push(c)
    } else {
      choose.push({ count: parsed.count, courses: parsed.courses })
    }
    if (parsed.minimum) for (const c of parsed.courses) minimums[c] = parsed.minimum
  }

  return { required, choose, minimums, rawText: items.join('; '), warnings }
}

/** "Minimum 70% English" -> { courses: ['ENG4U'], minimum: 70 } */
export function parseMinimumNote(text) {
  const m = text.match(/^minimum\s+(?:of\s+)?(\d{2})\s*%\s*(?:in\s+)?(.+)$/i)
  if (!m) return null
  const courses = findCourses(m[2])
  return courses.length ? { courses, minimum: Number(m[1]) } : null
}

const QUALIFIER_BOUNDS ={ low: [0, 3], mid: [4, 6], high: [7, 9] }

function bound(qualifier, decade, which) {
  const base = decade * 10
  if (!qualifier) return which === 'low' ? base : base + 9
  return base + QUALIFIER_BOUNDS[qualifier.toLowerCase()][which === 'low' ? 0 : 1]
}

/**
 * "Individual selection from the low to mid-90s" -> { low: 90, high: 96 }
 * "High 80s to low 90s" -> { low: 87, high: 93 }
 * "Mid 80s (regular) and High 80s (co-op)" -> { low: 84, high: 86 }  (first range wins)
 * "Minimum 75%" -> { low: 75, high: null }
 */
export function parseAdmissionRange(text) {
  if (!text) return null
  // "Low 80" (missing the s) -> "Low 80s"
  text = text.replace(/\b(low|mid|high)([\s-]+[5-9]0)\b(?!['’]?s)/gi, '$1$2s')
  const range =
    /\b(low|mid|high)?(?:\s*(?:to|-|–)\s*(low|mid|high))?[\s-]*([5-9])0['’]?s\b(?:\s*(?:to|-|–)\s*(low|mid|high)?[\s-]*([5-9])0['’]?s\b)?/i
  const m = text.match(range)
  if (m) {
    const [, q1, q2, d1, q3, d2] = m
    const low = bound(q1, Number(d1), 'low')
    const high = d2 ? bound(q3, Number(d2), 'high') : bound(q2 ?? q1, Number(d1), 'high')
    return { low, high }
  }
  const pct = text.match(/\b([5-9]\d)\s*%/)
  if (pct) return { low: Number(pct[1]), high: null }
  return null
}

const SUPPLEMENTARY_TYPES = [
  [/admission information form|\bAIF\b/i, 'Admission Information Form (AIF)'],
  [/interview/i, 'Interview'],
  [/portfolio/i, 'Portfolio'],
  [/video/i, 'Video'],
  [/supplement(?:al|ary)|profile/i, 'Supplementary application'],
]

/** Looks for supplementary application requirements in a list of sentences. */
export function detectSupplementary(sentences) {
  const relevant = sentences.filter(
    (s) =>
      SUPPLEMENTARY_TYPES.some(([re]) => re.test(s)) &&
      /\b(required|must|invited|deadline)\b/i.test(s) &&
      !/\bnot required\b.*\b(form|application|interview|portfolio)/i.test(s) &&
      // "For Western Integrated Science (WISc), ... supplemental application" applies to a sub-program only.
      !/^for\s/i.test(s.trim()),
  )
  if (relevant.length === 0) return { required: false, type: '', rawText: '' }
  const text = relevant.join(' ')
  const types = []
  for (const [re, label] of SUPPLEMENTARY_TYPES) {
    if (re.test(text) && !types.includes(label)) {
      // "Supplementary application" is the generic fallback; skip it if a specific type was found.
      if (label === 'Supplementary application' && types.length) continue
      types.push(label)
    }
  }
  return { required: true, type: types.join(' + '), rawText: text }
}

const FIELD_RULES = [
  ['Engineering', /engineering/i],
  ['Computer Science / Math', /comput|software|data science|\bmath|statistic|actuarial|combinatorics|optimization|information technology/i],
  ['Life Sciences / Health', /health|\bbio|life science|medic|kinesiology|nursing|pharma|neuro|nutrition|food|physiology|dentist|veterinar|optometry|animal/i],
  ['Physical Sciences / Environment', /chemistry|physics|earth|environment|climate|geolog|astronom|nanoscience|materials|^(honours )?science$/i],
  ['Business / Commerce', /business|commerce|accounting|financ|management|ivey|marketing/i],
  ['Arts / Design', /\bart\b|fine arts|music|design|drama|theatre|architect|film|digital arts/i],
]
const SOCIAL = 'Social Sciences / Humanities'
const SOCIAL_RULE = /histor|english|philosoph|politic|sociolog|anthropolog|psycholog|language|\blaw\b|legal|econom|geograph|education|french|classic|religio|social|humanities|communication|justice|linguistic|media/i

/**
 * Guesses fields of study from the program name (and faculty as a fallback).
 * Social Sciences / Humanities is only used when no more specific field matches,
 * plus for clearly social-science names like "Mathematical Economics".
 */
export function classifyFields(name, faculty = '') {
  const fields = FIELD_RULES.filter(([, re]) => re.test(name)).map(([field]) => field)
  if (SOCIAL_RULE.test(name) && !fields.includes(SOCIAL)) fields.push(SOCIAL)
  if (fields.length) return fields
  const fromFaculty = FIELD_RULES.find(([, re]) => re.test(faculty))
  return [fromFaculty ? fromFaculty[0] : SOCIAL]
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * "January 15" -> the next January 15 on or after `today` as "YYYY-MM-DD".
 * Deadlines repeat every year, so the next one is the one that matters.
 */
export function nextDate(monthDay, today) {
  const m = monthDay.match(/^(\w+)\s+(\d{1,2})$/)
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1
  if (month < 0) return null
  const day = Number(m[2])
  const now = /^\d{4}-\d{2}-\d{2}$/.test(today) ? new Date(`${today}T00:00:00Z`) : new Date()
  let year = now.getUTCFullYear()
  if (Date.UTC(year, month, day) < Date.UTC(year, now.getUTCMonth(), now.getUTCDate())) year++
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function cleanText(text) {
  return (text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Turns what an adapter scraped into a program in the website's format.
 * @param {object} raw  { id, name, campus, faculty, degree, requirementItems, averageText,
 *                        minimumNotes, supplementarySentences, coop, description, officialUrl }
 */
export function buildProgram(raw, universityId, today) {
  const prerequisites = buildPrerequisites(raw.requirementItems ?? [])
  const range = parseAdmissionRange(raw.averageText)
  const warnings = [...prerequisites.warnings]
  if (raw.averageText && !range) warnings.push(`Could not parse admission average: "${raw.averageText}"`)
  if (prerequisites.required.length === 0 && prerequisites.choose.length === 0) warnings.push('No required courses found')
  delete prerequisites.warnings
  for (const note of raw.minimumNotes ?? []) {
    const parsed = parseMinimumNote(note)
    if (parsed) for (const c of parsed.courses) prerequisites.minimums[c] = parsed.minimum
    else warnings.push(`Could not parse minimum grade: "${note}"`)
  }

  return {
    id: raw.id,
    name: raw.name,
    universityId,
    campus: raw.campus ?? '',
    faculty: raw.faculty ?? '',
    field: classifyFields(raw.name, raw.faculty),
    degree: raw.degree ?? '',
    prerequisites,
    admissionRange: { low: range?.low ?? null, high: range?.high ?? null, rawText: raw.averageText ?? '' },
    supplementary: detectSupplementary(raw.supplementarySentences ?? []),
    keyDates: (raw.keyDates ?? [])
      .map(({ label, on }) => ({ label, date: nextDate(on, today) }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date)),
    coop: Boolean(raw.coop),
    officialUrl: raw.officialUrl,
    description: raw.description ?? '',
    source: 'scraper',
    lastSynced: today,
    needsReview: warnings.length > 0,
    warnings,
  }
}
