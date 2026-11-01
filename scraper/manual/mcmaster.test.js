import { describe, it, expect } from 'vitest'
import { parseDates, parseSavedPage, toIsoDate } from './mcmaster.js'

// A cut-down saved page with the same structure as McMaster's requirements tool.
const table = (rows) => `<div class="col"><table class="table"><tbody>${rows}</tbody></table></div>`
const row = (th, td) => `<tr class="border-bottom"><th scope="row">${th}</th><td>${td}</td></tr>`
const courses = (html) => `<tr><th scope="row" colspan="2">Required Courses:</th></tr><tr><td colspan="2">${html}</td></tr>`
const page = (...tables) => `<!DOCTYPE html><html><body>
  <select id="programs1"><option value="">Select option</option><option value="1787">Engineering</option><option value="1771">Environmental &amp; Earth Sciences Gateway</option><option value="1782">Midwifery</option></select>
  <section id="admission_requirements">${tables.join('')}</section></body></html>`

const engineering = table(
  row('Program + degree', 'Engineering + B.Eng., B.Eng.Mgt.') +
    row('Anticipated Admission Range:', 'min. 87%') +
    courses('<p>… including:</p><ul><li>ENG4U</li><li>MCV4U</li><li>SCH4U</li><li>SPH4U</li></ul> Important Notes: <ul><li>Engineering I – Civil Engineering Track (CO-OP available)</li></ul>') +
    row('Application Deadline:', 'January 15, 2027. Recommended Early Application Submission: Thursday, November 12, 2026') +
    row('Supplementary Application Deadline:', 'January 28, 2027 at 11:59pm ET. Recommended Early Supplementary Application Submission: November 26, 2026 at 11:59pm ET') +
    row('Co-op/Internship:', 'Students can opt into the co-op stream at any point before their final year.'),
)

const environmental = table(
  row('Program + degree', 'Environmental &amp; Earth Sciences Gateway + B.Sc.') +
    row('Anticipated Admission Range:', 'Mid-80s') +
    courses(
      '<ul><li>ENG4U</li></ul><ul><li>One math: MHF4U or MCV4U</li></ul><ul><li>One science: SBI 4U or SCH4U</li></ul><ul><li>MCV4U is recommended</li></ul><ul><li>Students without calculus will be required to take calculus in Level I</li></ul>',
    ) +
    row('Application Deadline:', 'April 1, 2027') +
    row('Co-op/Internship:', 'Co-op opportunities available.'),
)

const midwifery = table(
  row('Program + degree', 'Midwifery + B.H.Sc. (Midwifery)') +
    row(
      'Anticipated Admission Range:',
      'Admission is by selection and interviews are by invitation only. Min. 85% is required for consideration. Typically, an average in the mid-high 80s has been required to be competitive.',
    ) +
    courses('<ul><li>ENG4U</li><li>SBI4U</li><li>SCH4U</li><li>Applicants must obtain a minimum grade of 85% in each of the required courses</li></ul>') +
    row('Application Deadline:', 'January 15, 2027') +
    row('Supplementary Application Deadline:', 'You must complete the Identity and Admissions Survey by February 1, 2027.') +
    row('Co-op/Internship:', 'Mandatory clinical placements are built into the structure of this program.'),
)

describe('McMaster saved pages', () => {
  const results = parseSavedPage(page(engineering, environmental, midwifery), '2026-11-01')
  const byId = Object.fromEntries(results.map((r) => [r.program.id, r]))

  it('reads every program table', () => {
    expect(Object.keys(byId)).toEqual(['mcmaster-engineering', 'mcmaster-environmental-and-earth-sciences-gateway', 'mcmaster-midwifery'])
  })

  it('reads courses, range, co-op, supplementary and a per-program link', () => {
    const { program, warnings } = byId['mcmaster-engineering']
    expect(program.prerequisites.required).toEqual(['ENG4U', 'MCV4U', 'SCH4U', 'SPH4U'])
    expect(program.admissionRange).toMatchObject({ low: 87, high: null })
    expect(program.coop).toBe(true)
    expect(program.supplementary).toMatchObject({ required: true, type: 'Supplementary application' })
    expect(program.officialUrl).toBe('https://future.mcmaster.ca/apply/requirements/')
    expect(program.source).toBe('manual')
    expect(program.lastSynced).toBe('2026-11-01')
    // The OUAC track list after "Important Notes" is not a course requirement.
    expect(warnings).toEqual([])
    expect(program.needsReview).toBe(false)
  })

  it('keeps choices separate, fixes "SBI 4U" and skips "recommended" notes', () => {
    const { program } = byId['mcmaster-environmental-and-earth-sciences-gateway']
    expect(program.prerequisites.required).toEqual(['ENG4U'])
    expect(program.prerequisites.choose).toEqual([
      { count: 1, courses: ['MHF4U', 'MCV4U'] },
      { count: 1, courses: ['SBI4U', 'SCH4U'] },
    ])
    expect(program.prerequisites.rawText).toContain('MCV4U is recommended')
    expect(program.supplementary.required).toBe(false)
  })

  it('Midwifery: minimum per course, interview, survey date, range starts at the minimum', () => {
    const { program } = byId['mcmaster-midwifery']
    expect(program.prerequisites.minimums).toEqual({ ENG4U: 85, SBI4U: 85, SCH4U: 85 })
    expect(program.admissionRange.low).toBe(85)
    expect(program.supplementary.type).toBe('Supplementary application + Interview')
    expect(program.keyDates).toContainEqual({ label: 'McMaster Identity and Admissions Survey due', date: '2027-02-01' })
    expect(program.coop).toBe(false)
  })

  it('a page saved before the results loaded has no programs', () => {
    expect(parseSavedPage(page(), '2026-11-01')).toEqual([])
  })
})

describe('McMaster dates', () => {
  it('labels early-submission dates by their wording, even in the other row (Bachelor of Technology)', () => {
    expect(
      parseDates(
        'January 15, 2027. Recommended Early Supplementary Application Submission: Thursday, November 26, 2026',
        'January 28, 2027 at 11:59 p.m. ET. Recommended Early Application Submission: Thursday, November 12, 2026',
      ),
    ).toEqual([
      { label: 'McMaster: recommended early application', date: '2026-11-12' },
      { label: 'McMaster: recommended early supplementary application', date: '2026-11-26' },
      { label: 'McMaster application deadline', date: '2027-01-15' },
      { label: 'McMaster supplementary application deadline', date: '2027-01-28' },
    ])
  })

  it('uses the Ontario high school (Group A) deadline and optional supplementary dates', () => {
    expect(
      parseDates('Current Ontario high school students (OUAC Group A): January 15, 2027 All other applicants (OUAC Group B): February 1, 2027', undefined),
    ).toEqual([{ label: 'McMaster application deadline', date: '2027-01-15' }])
    expect(parseDates('April 1, 2027', 'Optional supplemental application deadline: April 30, 2027. If your average …')).toContainEqual({
      label: 'McMaster optional supplementary application deadline',
      date: '2027-04-30',
    })
  })

  it('toIsoDate', () => {
    expect(toIsoDate('January 28, 2027')).toBe('2027-01-28')
    expect(toIsoDate('Early/mid-February 2027')).toBeNull()
  })
})
