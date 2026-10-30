// Each adapter is tested against a trimmed-down copy of its site's HTML structure.
// If a university redesigns its site, update the snippet here along with the adapter.

import { describe, it, expect } from 'vitest'
import * as waterloo from './waterloo.js'
import * as toronto from './toronto.js'
import * as western from './western.js'
import { buildProgram } from '../normalize.js'

const build = (adapter, html, url = 'https://example.com/p') =>
  adapter.parseProgram(html, url).map((raw) => buildProgram(raw, adapter.id, '2026-10-29'))

describe('waterloo', () => {
  const page = `
    <html><head><meta name="description" content="Earn a Data Science degree."></head><body><main>
      <h1>Data Science degree</h1>
      <h2>Co-op = relevant paid work experience</h2>
      <h2>Data Science admission requirements</h2>
      <h3>Ontario students</h3>
      <p>Six Grade 12 U and/or M courses including</p>
      <ul><li>Advanced Functions</li><li>Calculus and Vectors (minimum final grade of 70% is required)</li>
          <li>Any Grade 12 U English</li><li>One other 4U course</li></ul>
      <h4>Admission averages</h4>
      <p>Individual selection from the</p>
      <ul><li>mid-80s if applying directly to Data Science</li><li>low to mid-90s if applying through Computer Science.</li></ul>
      <p>Selected students will be invited to submit a portfolio.</p>
      <h4>Recommended course</h4>
      <p>Grade 11 U Introduction to Computer Science</p>
      <h3>For all students</h3>
      <ul><li>The Admission Information Form is required for admission.</li></ul>
      <h4>Questions?</h4><p>Contact our Faculty of Mathematics recruitment team.</p>
    </main></body></html>`

  it('parses a program page', () => {
    const [p] = build(waterloo, page, 'https://uwaterloo.ca/future-students/programs/data-science')
    expect(p).toMatchObject({
      id: 'waterloo-data-science',
      name: 'Data Science',
      faculty: 'Faculty of Mathematics',
      coop: true,
      description: 'Earn a Data Science degree.',
      admissionRange: { low: 84, high: 86 },
      needsReview: false,
    })
    expect(p.prerequisites.required).toEqual(['MHF4U', 'MCV4U', 'ENG4U'])
    expect(p.prerequisites.minimums).toEqual({ MCV4U: 70 })
    // Recommended ICS3U must not become a requirement.
    expect(p.prerequisites.required).not.toContain('ICS4U')
    expect(p.supplementary.type).toBe('Admission Information Form (AIF) + Portfolio')
  })

  it('skips pages without Ontario requirements', () => {
    expect(waterloo.parseProgram('<h1>Minors</h1><p>Add a minor</p>', 'x')).toEqual([])
  })
})

describe('toronto', () => {
  const campus = (id, title, subtitle, rows, programs) => `
    <div class="o-campus" id="${id}">
      <h2>${title}</h2>${subtitle ? `<div class="o-campus__subtitle">${subtitle}</div>` : ''}
      <div class="o-campus__program-items"><table><thead><tr><th>Name</th></tr></thead><tbody>${programs}</tbody></table></div>
      <div class="o-campus__requirements">
        <div class="o-campus__heading"><div class="s-wysiwyg"><ul><li>OSSD with six subjects at the 4U/M level, including English</li></ul></div></div>
        <div class="a-table-wrapper"><table><tbody>${rows}</tbody></table></div>
      </div>
    </div>`
  const page = `<html><body><h1>Psychology</h1>
    ${campus(
      'campus-utsc',
      'Scarborough campus',
      '',
      `<tr><td>English</td><td>ENG4U / EAE4U</td></tr>
       <tr><td>Biology Recommended</td><td>SBI4U</td></tr>
       <tr><td>One Math (Calculus &amp; Vectors / Advanced Functions) Recommended</td><td>MCV4U / MHF4U</td></tr>`,
      `<tr><td><span>Psychology Co-op</span></td><td>HBSc</td><td>Major</td><td>TPS</td></tr>`,
    )}
    ${campus(
      'campus-utsg',
      'St. George campus',
      'Faculty of Arts &amp; Science',
      `<tr><td>English</td><td>ENG4U / EAE4U</td></tr>
       <tr><td>Biology</td><td>SBI4U</td></tr>
       <tr><td>Calculus &amp; Vectors</td><td>MCV4U</td></tr>
       <tr><td>Supplemental Application</td><td>Required</td></tr>`,
      `<tr><td><span>Psychology</span></td><td>HBSc</td><td>Major</td><td>TLG</td></tr>`,
    )}
  </body></html>`

  it('creates one program per campus', () => {
    const [utsc, utsg] = build(toronto, page, 'https://future.utoronto.ca/program/psychology')
    expect(utsc).toMatchObject({
      id: 'toronto-scarborough-psychology',
      campus: 'Scarborough',
      faculty: 'U of T Scarborough',
      degree: 'HBSc',
      coop: true,
      officialUrl: 'https://future.utoronto.ca/program/psychology#campus-utsc',
    })
    // Recommended rows are skipped; ENG4U / EAE4U collapses to ENG4U.
    expect(utsc.prerequisites).toMatchObject({ required: ['ENG4U'], choose: [] })
    expect(utsc.supplementary.required).toBe(false)

    expect(utsg).toMatchObject({ campus: 'St. George', faculty: 'Faculty of Arts & Science', coop: false })
    expect(utsg.prerequisites.required).toEqual(['ENG4U', 'SBI4U', 'MCV4U'])
    expect(utsg.supplementary).toMatchObject({ required: true, type: 'Supplementary application' })
    expect(utsg.admissionRange.low).toBeNull()
  })
})

describe('toronto engineering FAQ', () => {
  const faq = `<html><body>
    <p>On that page, you will also find the deadlines.</p>
    <p>Applicants are encouraged to submit their Engineering Supplemental Application and supporting documents by December 1 for early consideration.</p>
    <p>The deadline for students to complete their Engineering Supplemental Application and submit all supporting documents is January 15.</p>
    <table><tbody>
      <tr><td><strong>GRADE RANGE</strong></td><td><strong>PROGRAMS</strong></td></tr>
      <tr><td>Low to Mid 90's</td><td>Computer Engineering, Electrical Engineering, Engineering Science</td></tr>
      <tr><td>High 80's to Low 90's</td><td>Chemical Engineering, Mechanical Engineering</td></tr>
    </tbody></table></body></html>`

  it('reads grade ranges, the supplemental application and deadlines', () => {
    const e = toronto.parseEngineeringFaq(faq)
    expect(e.ranges).toEqual([
      { averageText: "Low to Mid 90's", names: ['Computer Engineering', 'Electrical Engineering', 'Engineering Science'] },
      { averageText: "High 80's to Low 90's", names: ['Chemical Engineering', 'Mechanical Engineering'] },
    ])
    expect(e.keyDates.map((d) => d.on)).toEqual(['December 1', 'January 15'])
    expect(e.supplementarySentence).toMatch(/deadline .* January 15/)
  })

  it('applies them to St. George engineering programs, tolerating typos in the name', () => {
    const context = { engineering: toronto.parseEngineeringFaq(faq) }
    const page = (name) => `<h1>${name}</h1>
      <div class="o-campus" id="campus-utsg"><h2>St. George campus</h2>
        <div class="o-campus__subtitle">Faculty of Applied Science &amp; Engineering</div>
        <div class="o-campus__requirements"><div class="a-table-wrapper"><table><tbody>
          <tr><td>Calculus &amp; Vectors</td><td>MCV4U</td></tr></tbody></table></div></div></div>`

    const [electrical] = build({ ...toronto, parseProgram: (h, u) => toronto.parseProgram(h, u, context) }, page('Electical Engineering'))
    expect(electrical.admissionRange).toMatchObject({ low: 90, high: 96 })
    expect(electrical.supplementary.required).toBe(true)
    expect(electrical.keyDates.map((d) => d.label)).toEqual([
      'Engineering Supplemental Application — early consideration',
      'Engineering Supplemental Application deadline',
    ])

    const [mech] = build({ ...toronto, parseProgram: (h, u) => toronto.parseProgram(h, u, context) }, page('Mechanical Engineering'))
    expect(mech.admissionRange).toMatchObject({ low: 87, high: 93 })

    // Without the FAQ (e.g. it failed to download) nothing breaks.
    const [plain] = build(toronto, page('Mechanical Engineering'))
    expect(plain.admissionRange.low).toBeNull()
    expect(plain.keyDates).toEqual([])
  })
})

describe('toronto campus detail pages', () => {
  it('only follows links to campus sites it can read', () => {
    expect(toronto.wantsDetail('https://www.utsc.utoronto.ca/admissions/programs/astronomy-astrophysics')).toBe(true)
    expect(toronto.wantsDetail('https://utsc.utoronto.ca/admissions/programs/anthropology')).toBe(true)
    expect(toronto.wantsDetail('https://www.utm.utoronto.ca/future-students/programs/accounting')).toBe(true)
    expect(toronto.wantsDetail('https://www.artsci.utoronto.ca/future/ready-apply/admission-categories/x')).toBe(false)
    expect(toronto.wantsDetail('')).toBe(false)
  })

  it('reads Scarborough approximate grade requirements', () => {
    const html = `<div class="mb-4"><strong>Approximate grade requirements</strong><br>
      <ul><li>Minimum 70% English</li><li><div><p>Mid-70s overall</p></div></li></ul></div>
      <div class="mb-4"><strong>Approximate grade requirements</strong><br><ul><li>Canadian: something else</li></ul></div>`
    const detail = toronto.parseDetail(html, 'https://www.utsc.utoronto.ca/admissions/programs/astronomy-astrophysics')
    expect(detail).toEqual({ averageText: 'Mid-70s overall', minimumNotes: ['Minimum 70% English'] })

    const [p] = [{ id: 't', name: 'Astronomy', requirementItems: ['English => ENG4U / EAE4U'], officialUrl: 'x', ...detail }].map((raw) =>
      buildProgram(raw, 'toronto', 'today'),
    )
    expect(p.admissionRange).toMatchObject({ low: 74, high: 76 })
    expect(p.prerequisites.minimums).toEqual({ ENG4U: 70 })
  })

  it('reads the Mississauga competitive average', () => {
    const html = `<div class="admissions-box"><div class="field field-name-field-approximate-grade-requirem">
      <div class="field-label">Competitive Average <a title="guideline"></a></div><p> Mid 80s </p></div></div>`
    expect(toronto.parseDetail(html, 'https://www.utm.utoronto.ca/future-students/programs/accounting')).toEqual({ averageText: 'Mid 80s' })
  })

  it('returns nothing when the page has no averages', () => {
    expect(toronto.parseDetail('<p>No grades here</p>', 'https://www.utm.utoronto.ca/x')).toEqual({})
  })
})

describe('western', () => {
  const page = `<html><head><meta name="description" content="Science at Western"></head><body>
    <h1>Science</h1>
    <div class="card-body"><h2 class="card-title">Admission Requirements</h2>
      <div class="card-text"><h4>Ontario High School (Group A)</h4>
        <ul>
          <li>Required Courses:&nbsp;<ul>
            <li>English (ENG4U)</li><li>Calculus and Vectors (MCV4U)&nbsp;</li>
            <li>And two of:&nbsp;Advanced Functions (MHF4U),&nbsp;Biology (SBI4U),&nbsp;Chemistry (SCH4U)</li>
          </ul></li>
          <li>Admission Average Guideline:&nbsp;<strong>Low to mid 80s</strong><ul><li>Averages reflect Ontario high school students.</li></ul></li>
          <li>For Western Integrated Science (WISc), Chemistry (SCH4U) is required and you must submit a supplemental application.</li>
        </ul>
      </div>
    </div>
    <h2>Science Co-op Program</h2>
  </body></html>`

  it('parses the admission requirements card', () => {
    const [p] = build(western, page, 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/science.html')
    expect(p).toMatchObject({
      id: 'western-science',
      name: 'Science',
      coop: true,
      admissionRange: { low: 80, high: 86, rawText: 'Low to mid 80s' },
      needsReview: false,
    })
    expect(p.prerequisites.required).toEqual(['ENG4U', 'MCV4U'])
    expect(p.prerequisites.choose).toEqual([{ count: 2, courses: ['MHF4U', 'SBI4U', 'SCH4U'] }])
    // The WISc note only applies to a sub-program.
    expect(p.supplementary.required).toBe(false)
  })

  it('skips pages without an admission requirements card (e.g. Ivey)', () => {
    expect(western.parseProgram('<h1>Ivey</h1>', 'x')).toEqual([])
  })
})
