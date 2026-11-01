// Each adapter is tested against a trimmed-down copy of its site's HTML structure.
// If a university redesigns its site, update the snippet here along with the adapter.

import { describe, it, expect } from 'vitest'
import * as waterloo from './waterloo.js'
import * as toronto from './toronto.js'
import * as western from './western.js'
import * as carleton from './carleton.js'
import * as ottawa from './ottawa.js'
import * as york from './york.js'
import * as queens from './queens.js'
import * as tmu from './tmu.js'
import * as laurier from './laurier.js'
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

  it('uses the Arts & Science admission category range for St. George programs', () => {
    const link = (href) => `<div class="o-campus__detail-link"><a href="${href}">Learn more</a></div>`
    const withCategory = page.replace(
      '<div class="o-campus" id="campus-utsg">',
      `<div class="o-campus" id="campus-utsg">${link('https://www.artsci.utoronto.ca/future/ready-apply/admission-categories/life-sciences')}`,
    )
    const [utsc, utsg] = build(toronto, withCategory, 'https://future.utoronto.ca/program/psychology')
    expect(utsg.admissionRange).toMatchObject({ low: 84, high: 89, rawText: 'Mid to high 80s' })
    expect(utsc.admissionRange.low).toBeNull()
  })

  it('maps admission category links to ranges', () => {
    const base = 'https://www.artsci.utoronto.ca/future/ready-apply/admission-categories/'
    expect(toronto.artsciCategoryAverage(`${base}computer-science`)).toBe('Low 90s')
    expect(toronto.artsciCategoryAverage(`${base}physical-mathematical-sciences#x`)).toBe('Mid to high 80s')
    expect(toronto.artsciCategoryAverage(`${base}unknown`)).toBe('')
    expect(toronto.artsciCategoryAverage('https://music.utoronto.ca/programs/undergraduate/jazz')).toBe('')
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

  it('reads one program per tab on pages with several entry points', () => {
    const pane = (ouac, extra, avg) => `<div class="tab-pane"><div class="p-5"><p><strong>OUAC Code = ${ouac}</strong></p>
      <h4>Ontario High School (Group A) Requirements</h4>
      <ul>
        <li>Required Courses:<ul><li>English, ENG4U</li></ul></li>
        ${extra}
        <li>Admission Average Guideline: ${avg}<ul><li>Remember, these are guidelines only</li></ul></li>
      </ul></div></div>`
    const tabbed = `<html><body><h1>Music</h1><div><h2>Admission Requirements</h2></div>
      <nav class="tab-container">
        <button class="tab-button">Bachelor of Music (BMus)<br/></button>
        <button class="tab-button">Music Administrative Studies<br/></button>
        <button class="tab-button">Compressed Time Frame<br/></button>
        ${pane('EM', '<li><a>Required Admission Process</a>:<ul><li>Audition and Interview</li><li>Questionnaire</li></ul></li>', 'Low 80s')}
        ${pane('EMS', '', '<strong>Mid 80s</strong>')}
        <div class="tab-pane"><h4>Regular Stream Compressed</h4><ul><li>60% in each of: anatomy</li></ul></div>
      </nav></body></html>`
    const programs = western.parseProgram(tabbed, 'u').map((raw) => buildProgram(raw, 'western', 'today'))
    expect(programs.map((p) => p.name)).toEqual(['Music: Bachelor of Music (BMus)', 'Music Administrative Studies'])
    expect(programs[0]).toMatchObject({
      id: 'western-music-bachelor-of-music-bmus',
      admissionRange: { low: 80, high: 83 },
      supplementary: { required: true, type: 'Interview + Audition' },
    })
    expect(programs[1].admissionRange).toMatchObject({ low: 84, high: 86 })
    expect(programs[1].supplementary.required).toBe(false)
  })

  it('skips pages without an admission requirements card (e.g. Ivey)', () => {
    expect(western.parseProgram('<h1>Ivey</h1>', 'x')).toEqual([])
  })
})

describe('carleton', () => {
  const page = (title, header, items, cutoff) => `
    <html><body>
      <h2>Admission Requirements</h2><section><ul><li>OSSD with six Grade 12 courses at the 4U or 4M level</li></ul>
      <div><h2>Specific Requirements</h2><h3>${title}</h3>
        <table class="cutable"><thead><tr>${header}</tr></thead>
          <tbody><tr><td><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></td></tr></tbody></table>
      </div></section>
      <div><h4>Program Information</h4><a href="https://admissions.carleton.ca/programs/computer-science/">${title}</a>
        <ul><li><h5>Cut off Range:</h5><div><p>${cutoff}</p></div></li></ul></div>
    </body></html>`

  it('parses the requirements shown for the selected program', () => {
    const html = page('Computer Science (BCS)', '<th><strong>Required Courses</strong></th>', ['Advanced Functions', 'Calculus and Vectors'], '80-85%')
    const [p] = build(carleton, html)
    expect(p).toMatchObject({
      id: 'carleton-computer-science',
      name: 'Computer Science',
      degree: 'BCS',
      officialUrl: 'https://admissions.carleton.ca/programs/computer-science/',
      admissionRange: { low: 80, high: 85 },
      needsReview: false,
    })
    expect(p.prerequisites.required).toEqual(['MHF4U', 'MCV4U'])
  })

  it('handles <td> headers and "No specific prerequisites"', () => {
    const [p] = build(carleton, page('Arts (BA)', '<td><strong>Required Courses</strong></td>', ['No specific prerequisites'], '75%'))
    expect(p).toMatchObject({ name: 'Arts', degree: 'BA', admissionRange: { low: 75, high: null }, needsReview: false })
  })

  it('picks the degree, not a word in brackets', () => {
    expect(carleton.splitDegree('Commerce (Business) (BCom)')).toEqual({ name: 'Commerce (Business)', degree: 'BCom' })
  })

  it('asks for the program with the cookies the form sets', async () => {
    let seen
    await carleton.fetchProgram('https://admissions.carleton.ca/applicant-type/x/#program-431', (url, options) => (seen = options))
    expect(seen.headers.Cookie).toBe('apply_type=1252; apply_program=431')
  })

  it('skips pages without a selected program', () => {
    expect(carleton.parseProgram('<h2>Admission Requirements</h2>', 'x')).toEqual([])
  })
})

describe('ottawa', () => {
  const fragment = `
    <div class="art-render__program-name"><div><h2>Your program</h2><p>Honours BSc Computer Science (BSc)</p></div></div>
    <div class="grid"><div class="event-detail__content">
      <h3>About this program</h3><div class="rich-text"><p>Limited enrolment</p></div>
      <h3>Prerequisite courses and requirements</h3>
      <div class="rich-text"><ul><li>English 4U (ENG4U) or Français 4U (FRA4U)</li><li>Advanced Functions 4U (MHF4U)</li>
        <li>Calculus and Vectors 4U (MCV4U)</li><li>Auditions</li></ul></div>
      <h3>Notes</h3><p>A minimum combined average of 70% is required for all prerequisite courses in mathematics.</p>
    </div>
    <div class="event-detail__sidebar">
      <div class="event-detail__sidebar--item"><div class="eyebrow">Faculty</div><p><strong>Engineering</strong></p></div>
      <div class="event-detail__sidebar--item"><div class="eyebrow">Minimum admission average</div><p><strong><p>80%</p></strong></p></div>
      <div class="event-detail__sidebar--item"><div class="eyebrow">Streams</div><div class="rich-text"><ul><li>Co-operative Education</li></ul></div></div>
    </div></div>`
  const url = 'https://www.uottawa.ca/api/uottawa_art_api/render?discipline=78#Computer%20Science'

  it('parses the requirements fragment', () => {
    const [p] = build(ottawa, fragment, url)
    expect(p).toMatchObject({
      id: 'ottawa-computer-science',
      name: 'Computer Science',
      degree: 'BSc',
      faculty: 'Faculty of Engineering',
      coop: true,
      admissionRange: { low: 80, high: null },
      needsReview: false,
    })
    expect(p.prerequisites.required).toEqual(['ENG4U', 'MHF4U', 'MCV4U'])
    expect(p.supplementary).toMatchObject({ required: true, type: 'Audition' })
  })

  it('reads the double-encoded options list', () => {
    const text = JSON.stringify(JSON.stringify([{ 78: 'Computer Science', text: '' }]))
    expect(ottawa.parseOptions(text)).toEqual([{ id: '78', label: 'Computer Science' }])
  })

  it('finds the degree in the official title', () => {
    expect(ottawa.degreeFrom('Honours Bachelor of Commerce in Accounting')).toBe('Bachelor of Commerce')
    expect(ottawa.degreeFrom('Bachelor of Music and Honours Bachelor of Science in Biology')).toBe('Bachelor of Music')
    expect(ottawa.degreeFrom('Joint Honours BSocSc in Anthropology and Sociology')).toBe('BSocSc')
  })

  it('skips empty responses', () => {
    expect(ottawa.parseProgram('', url)).toEqual([])
  })
})

describe('york', () => {
  const block = (degree, cohort, items, average, notes = '') => `
    <div class="requirements-content-content"><h3>${degree}</h3>
      <div><div class="ds-admit-req-equivalency" data-shortcode="${cohort}"><div class="equivalency-main"><div class="equivalency-body">
        <div>Requirements for admission:</div>
        ${items.map((i) => `<li class="ds-list-no-style">${i}</li>`).join('')}
        <div class="equivalency-requirement-average"><span class="equivalency-public-offering">${average}</span></div>
        ${notes}
        <div><strong><span class="equivalency-public-offering">OUAC code <span>YPK</span></span></strong></div>
      </div></div></div></div>
    </div>`
  const page = `
    <html><head><meta name="description" content="Study computer science at Lassonde."></head><body>
      <h1>Computer Science</h1>
      <h3>Offered by</h3><p>Lassonde School of Engineering</p>
      <h3>Offered at</h3><p>Keele Campus</p>
      <h3>Applied Learning Opportunities</h3><ul><li>Co-op</li></ul>
      ${block('BSc', 'ab', ['Math 30-1'], 'Applicants with averages in the low 80s')}
      ${block('BA', 'on', ['<strong>Ontario Secondary School Diploma (OSSD)</strong>', '<strong>ENG4U</strong>', '<strong>MHF4U</strong>', '<strong>4U math</strong>', 'And <strong>three additional 4U or M courses</strong>'], 'Applicants with averages in the <strong>low 80s</strong> or higher may be considered for admission.')}
      ${block('BSc', 'on', ['<strong>ENG4U</strong>', '<strong>SCH4U</strong> or <strong>SPH4U</strong>', '<strong>4U math (minimum grade of 75% required)</strong>', 'A supplementary evaluation is required after you apply for admission.'], 'Applicants with averages in the <strong>mid-80s</strong> or higher')}
      ${block('iBA', 'on', ['<strong>ENG4U</strong>'], 'low 80s')}
    </body></html>`

  it('makes one program per degree from the Ontario blocks', () => {
    const programs = build(york, page, 'https://futurestudents.yorku.ca/program/computer-science')
    expect(programs.map((p) => p.id)).toEqual(['york-computer-science-ba', 'york-computer-science-bsc'])
    const [ba, bsc] = programs
    expect(ba).toMatchObject({
      name: 'Computer Science',
      degree: 'BA',
      campus: 'Keele',
      faculty: 'Lassonde School of Engineering',
      coop: true,
      admissionRange: { low: 80, high: 83 },
      needsReview: false,
    })
    expect(ba.prerequisites.required).toEqual(['ENG4U', 'MHF4U'])
    expect(ba.prerequisites.choose).toEqual([{ count: 1, courses: ['MCV4U', 'MDM4U'] }])
    expect(bsc.prerequisites.choose).toEqual([
      { count: 1, courses: ['SCH4U', 'SPH4U'] },
      { count: 1, courses: ['MHF4U', 'MCV4U', 'MDM4U'] },
    ])
    expect(bsc.prerequisites.minimums).toMatchObject({ MHF4U: 75 })
    expect(bsc.supplementary).toMatchObject({ required: true, type: 'Supplementary application' })
  })

  it('spells out "4U science" and "4U French"', () => {
    expect(york.rewriteItem('4U science', [])).toBe('One of SBI4U or SCH4U or SPH4U or SES4U')
    expect(york.rewriteItem('4U French', [])).toBe('One of FSF4U or FEF4U')
    expect(york.rewriteItem('ENG4U', [])).toBe('ENG4U')
  })

  it('skips programs that are not for students coming from high school', () => {
    const html = `<h1>Individualized Studies</h1>${block('BA', 'on', ['ENG4U', 'NOTE: this program is not for direct entry.'], '')}`
    expect(york.parseProgram(html, 'https://futurestudents.yorku.ca/program/individualized-studies/laps')).toEqual([])
  })
})

describe('queens', () => {
  const page = `
    <html><body>
      <div class="program-requirement-collection"><h3>Music</h3>
        <div class="program-requirement"><h4 class="program-requirement-title">Music (QM)</h4>
          <p>English 4U. Additional five required courses may be 4U or 4M. Personal audition and interview.</p></div>
      </div>
      <div class="program-requirement-collection"><h3>Smith Commerce</h3>
        <h4>Smith Commerce (QC)</h4>
        <p>English 4U, Calculus and Vectors 4U, and one additional 4U Mathematics course, with minimum grades of 80% in these three prerequisite courses.</p>
        <p>Mandatory supplementary application.</p>
      </div>
      <div class="program-requirement-collection"><h3>Education</h3>
        <h4>Music (QM)</h4><p>English 4U.</p>
      </div>
    </body></html>`
  const averages = queens.parseAverages(`<table><tr><th>Program</th><th>Grade</th></tr>
    <tr><td>Music* (QM)</td><td>Low-80s</td></tr><tr><td>Commerce* (QC)</td><td>90%+</td></tr></table>`)

  it('reads the competitive average table', () => {
    expect(averages).toEqual({ QM: 'Low-80s', QC: '90%+' })
  })

  it('parses each program once, joining averages by code', () => {
    const programs = queens.parseProgram(page, 'https://www.queensu.ca/x', { averages }).map((raw) => buildProgram(raw, 'queens', '2026-10-30'))
    expect(programs.map((p) => p.id)).toEqual(['queens-music', 'queens-smith-commerce'])
    const [music, commerce] = programs
    expect(music).toMatchObject({ faculty: 'Music', admissionRange: { low: 80, high: 83 }, needsReview: false })
    expect(music.supplementary).toMatchObject({ required: true, type: 'Interview + Audition' })
    expect(commerce.prerequisites).toMatchObject({
      required: ['ENG4U', 'MCV4U'],
      choose: [{ count: 1, courses: ['MHF4U', 'MDM4U'] }],
      minimums: { ENG4U: 80, MCV4U: 80 },
    })
    expect(commerce.admissionRange).toMatchObject({ low: 90, high: null })
    expect(commerce.supplementary.required).toBe(true)
  })
})

describe('tmu', () => {
  const page = (requirements, heading) => `
    <html><body>
      <h1>Computer Science - BSc (Hons)</h1>
      <p><strong>Requirements:<br></strong><a href="#requirements">${requirements}</a><br><strong>Grade range:</strong><br><a href="#requirements">75-80%</a></p>
      <h3>Career-integrated co-op program</h3>
      ${heading}
      <p>To be considered for admission, Ontario high school students must meet the following requirements:</p>
      <ul><li>Completion of the Ontario Secondary School Diploma (OSSD)</li>
        <li>Completion of the following required Grade 12 U courses (minimum grade of 70% in each):</li></ul>
      <ul><li>English/anglais (ENG4U/EAE4U preferred)</li><li>Advanced Functions (MHF4U)</li>
        <li>2 of Physics (SPH4U), Chemistry (SCH4U) or Biology (SBI4U)</li><li>MCV4U is the preferred mathematics course</li></ul>
      <h4>Find your requirements</h4><ul><li>Ontario secondary school students</li></ul>
      <h3>Academic requirements for part-time program</h3><ul><li>Calculus and Vectors (MCV4U)</li></ul>
    </body></html>`

  it.each([
    ['a plain heading', '<h3>Academic requirements for full-time, 4-year program</h3>'],
    ['an accordion panel', '<div class="panel-heading"><h3 class="panel-title"><button>Academic requirements for full-time, 4-year program</button></h3></div>'],
  ])('parses requirements under %s', (_, heading) => {
    const [p] = build(tmu, page('Grades-Only', heading), 'https://www.torontomu.ca/programs/undergraduate/computer-science/')
    expect(p).toMatchObject({
      id: 'tmu-computer-science',
      name: 'Computer Science',
      degree: 'BSc (Hons)',
      coop: true,
      admissionRange: { low: 75, high: 80 },
      supplementary: { required: false },
      needsReview: false,
    })
    expect(p.prerequisites.required).toEqual(['ENG4U', 'MHF4U'])
    expect(p.prerequisites.choose).toEqual([{ count: 2, courses: ['SPH4U', 'SCH4U', 'SBI4U'] }])
    expect(p.prerequisites.minimums).toMatchObject({ ENG4U: 70, MHF4U: 70 })
  })

  it('marks Grades-Plus programs as needing supplementary material', () => {
    const [p] = build(tmu, page('Grades-Plus', '<h3>Academic requirements for full-time, 4-year program</h3>'))
    expect(p.supplementary.required).toBe(true)
  })

  it('skips programs without high school requirements', () => {
    expect(tmu.parseProgram('<h1>Nursing - BScN</h1><h3>Academic requirements for full-time</h3><ul><li>A diploma in nursing</li></ul>', 'x')).toEqual([])
  })
})

describe('laurier', () => {
  const page = (title, panel) => `
    <html><body>
      <h1>${title}</h1>
      <h3>How Will I Gain Real-World Experience?</h3><p>Some favourites:</p><ul><li>Co-op You can apply to co-op.</li></ul>
      <h3 class="accordion-header">How Do I Apply for This Program on OUAC?</h3><div>This program is offered on our Waterloo campus.</div>
      <h3 class="accordion-header">What Are the Ontario High School Admission Requirements?</h3>
      <div>${panel}</div>
    </body></html>`
  const url = (slug) => `https://www.wlu.ca/programs/science/undergraduate/${slug}/index.html`

  it('makes one program per degree list', () => {
    const html = page(
      'Computer Science (BA or BSc)',
      `<strong>BA requirements</strong><br><ul><li>Average admission range: high 70s</li><li>English at 60%</li><li>Advanced Functions at 60%</li>
         <li>All prerequisite courses calculated in admissions average</li></ul>
       <p><strong>BSc requirements</strong></p><ul><li>Average admission range: high 70s</li><li>English at 60%</li>
         <li>One of Calculus &amp; Vectors, Chemistry or Physics at 60%</li></ul>`,
    )
    const [ba, bsc] = build(laurier, html, url('computer-science-ba-or-bsc-waterloo'))
    expect(ba).toMatchObject({
      id: 'laurier-computer-science-ba-or-bsc-waterloo-ba',
      name: 'Computer Science',
      degree: 'BA',
      campus: 'Waterloo',
      coop: true,
      admissionRange: { low: 77, high: 79 },
      needsReview: false,
    })
    expect(ba.prerequisites).toMatchObject({ required: ['ENG4U', 'MHF4U'], minimums: { ENG4U: 60, MHF4U: 60 } })
    expect(bsc.prerequisites.choose).toEqual([{ count: 1, courses: ['MCV4U', 'SCH4U', 'SPH4U'] }])
  })

  it('names options after the page program', () => {
    const html = page(
      'Chemistry (BSc)',
      `<strong>Chemistry (BSc) requirements</strong><ul><li>Average admission range: mid 70s</li><li>English at 60%</li></ul>
       <strong>Medical Foundation Partnership Minor requirements</strong><ul><li>Average admission range: high 70s</li><li>Biology at 70%</li></ul>`,
    )
    const programs = build(laurier, html, url('chemistry-bsc'))
    expect(programs.map((p) => [p.id, p.name])).toEqual([
      ['laurier-chemistry-bsc-waterloo', 'Chemistry (BSc)'],
      ['laurier-chemistry-bsc-medical-foundation-partnership-minor-waterloo', 'Chemistry: Medical Foundation Partnership Minor'],
    ])
  })
})
