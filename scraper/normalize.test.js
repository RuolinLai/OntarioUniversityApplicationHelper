import { describe, it, expect } from 'vitest'
import {
  findCourses,
  parseRequirementItem,
  buildPrerequisites,
  parseAdmissionRange,
  parseMinimumNote,
  detectSupplementary,
  classifyFields,
  nextDate,
  slugify,
} from './normalize.js'

// The example strings below are copied from real program pages.

describe('findCourses', () => {
  it('finds course codes', () => {
    expect(findCourses('English (ENG4U)')).toEqual(['ENG4U'])
    expect(findCourses('ENG4U / EAE4U')).toEqual(['ENG4U', 'EAE4U'])
  })

  it('finds course names and prefers the longest match', () => {
    expect(findCourses('Calculus and Vectors')).toEqual(['MCV4U'])
    expect(findCourses('Calculus & Vectors')).toEqual(['MCV4U'])
    expect(findCourses('Two of Biology, Chemistry, Earth and Space Science, Mathematics of Data Management, Physics')).toEqual([
      'SBI4U',
      'SCH4U',
      'SES4U',
      'MDM4U',
      'SPH4U',
    ])
  })

  it('does not count the same course twice when both name and code appear', () => {
    expect(findCourses('Biology, (SBI4U)')).toEqual(['SBI4U'])
    expect(findCourses('Computer and Information Science (ICS4U)')).toEqual(['ICS4U'])
  })
})

describe('parseRequirementItem', () => {
  it('single required course with a minimum grade', () => {
    expect(parseRequirementItem('Advanced Functions (minimum final grade of 70% is required)')).toEqual({
      kind: 'required',
      courses: ['MHF4U'],
      count: 1,
      minimum: 70,
    })
    expect(parseRequirementItem('English (ENG4U) (A minimum final grade of 78% is required)').minimum).toBe(78)
    expect(parseRequirementItem('any Grade 12 U English (minimum final grade of at least 70%)').courses).toEqual(['ENG4U'])
  })

  it('"X or Y" means choose one', () => {
    expect(parseRequirementItem('Advanced Functions or Calculus and Vectors (minimum final grade of 70%)')).toMatchObject({
      kind: 'choose',
      count: 1,
      courses: ['MHF4U', 'MCV4U'],
    })
    expect(parseRequirementItem('English => ENG4U / EAE4U')).toMatchObject({ kind: 'choose', count: 1, courses: ['ENG4U', 'EAE4U'] })
  })

  it('"two of" / "any two of" / "and one of"', () => {
    expect(parseRequirementItem('Any two of Biology, Chemistry, and Physics (minimum final grade of 70%)')).toMatchObject({
      kind: 'choose',
      count: 2,
      courses: ['SBI4U', 'SCH4U', 'SPH4U'],
    })
    expect(
      parseRequirementItem('And one of: Math of Data Management (MDM4U), Biology (SBI4U), Chemistry (SCH4U), Physics (SPH4U)'),
    ).toMatchObject({ kind: 'choose', count: 1, courses: ['MDM4U', 'SBI4U', 'SCH4U', 'SPH4U'] })
  })

  it('"any Grade 12 U Mathematics" means one of the three math courses', () => {
    expect(parseRequirementItem('Any Grade 12 U Mathematics (minimum final grade of 70% is required)')).toMatchObject({
      kind: 'choose',
      count: 1,
      courses: ['MHF4U', 'MCV4U', 'MDM4U'],
    })
  })

  it('"One Grade 12 U Mathematics course" means one of the three math courses', () => {
    expect(parseRequirementItem('One Grade 12 U Mathematics course (minimum final grade of 70% is required)')).toMatchObject({
      kind: 'choose',
      count: 1,
      courses: ['MHF4U', 'MCV4U', 'MDM4U'],
    })
  })

  it('ignores lines that are not specific courses', () => {
    expect(parseRequirementItem('One other 4U course').kind).toBe('ignored')
  })

  it('ignores Grade 11 requirements without a warning', () => {
    expect(parseRequirementItem('Functions (MCF3M or MCR3U)')).toMatchObject({ kind: 'ignored', grade11: true })
    expect(buildPrerequisites(['Functions (MCF3M or MCR3U)']).warnings).toEqual([])
  })
})

describe('buildPrerequisites', () => {
  it('combines lines like the Waterloo Software Engineering page', () => {
    const p = buildPrerequisites([
      'Advanced Functions (minimum final grade of 70% is required)',
      'Calculus and Vectors (minimum final grade of 70% is required)',
      'Chemistry (minimum final grade of 70% is required)',
      'Physics (minimum final grade of 70% is required)',
      'English (ENG4U) (minimum final grade of 70% is required)',
    ])
    expect(p.required).toEqual(['MHF4U', 'MCV4U', 'SCH4U', 'SPH4U', 'ENG4U'])
    expect(p.choose).toEqual([])
    expect(p.minimums.MHF4U).toBe(70)
    expect(p.warnings).toEqual([])
  })

  it('does not warn about "one other 4U course" but warns about unknown lines', () => {
    expect(buildPrerequisites(['Any Grade 12 U English', 'One other 4U course']).warnings).toEqual([])
    expect(buildPrerequisites(['Grade 12 Underwater Basket Weaving']).warnings).toHaveLength(1)
  })

  it('treats "ENG4U / EAE4U" as plain English', () => {
    expect(buildPrerequisites(['English => ENG4U / EAE4U'])).toMatchObject({ required: ['ENG4U'], choose: [] })
  })
})

describe('parseAdmissionRange', () => {
  it.each([
    ['Individual selection from the low to mid-90s', 90, 96],
    ['Low to mid 80s', 80, 86],
    ['High 80s to low 90s', 87, 93],
    ['Admission averages: Mid 80s (regular) and High 80s (co-op)', 84, 86],
    ['Admission average: High 70s (co-op and regular)', 77, 79],
    ['Individual selection from the mid-80s', 84, 86],
    ['Admission averages: low 80s', 80, 83],
    ['Minimum 75% to be considered', 75, null],
    ['Low 80', 80, 83],
  ])('%s', (text, low, high) => {
    expect(parseAdmissionRange(text)).toEqual({ low, high })
  })

  it('returns null when there is no number', () => {
    expect(parseAdmissionRange('Competitive')).toBeNull()
    expect(parseAdmissionRange('')).toBeNull()
  })
})

describe('parseMinimumNote', () => {
  it('reads "Minimum 70% English"', () => {
    expect(parseMinimumNote('Minimum 70% English')).toEqual({ courses: ['ENG4U'], minimum: 70 })
    expect(parseMinimumNote('Minimum 65% in Calculus and Vectors')).toEqual({ courses: ['MCV4U'], minimum: 65 })
    expect(parseMinimumNote('Mid-70s overall')).toBeNull()
  })
})

describe('detectSupplementary', () => {
  it('finds the AIF', () => {
    expect(detectSupplementary(['The Admission Information Form is required for admission.'])).toMatchObject({
      required: true,
      type: 'Admission Information Form (AIF)',
    })
  })

  it('combines AIF and interview', () => {
    const s = detectSupplementary([
      'There are supplementary information forms, including the Admission Information Form, and an online interview which are required for admission.',
    ])
    expect(s.type).toBe('Admission Information Form (AIF) + Interview')
  })

  it('ignores contests, sub-program notes and optional items', () => {
    expect(
      detectSupplementary([
        'Participation in the Canadian Senior Mathematics Contest and/or the Euclid Mathematics Contest is not required for admission.',
        'For Western Intergrated Science (WISc), Chemistry (SCH4U) is required and you must submit a supplemental application.',
      ]).required,
    ).toBe(false)
  })

  it('handles UofT style rows', () => {
    expect(detectSupplementary(['Supplemental Application: Required'])).toMatchObject({
      required: true,
      type: 'Supplementary application',
    })
  })
})

describe('classifyFields', () => {
  it.each([
    ['Computer Science', ['Computer Science / Math']],
    ['Software Engineering', ['Engineering', 'Computer Science / Math']],
    ['Health Sciences', ['Life Sciences / Health']],
    ['Accounting and Financial Management', ['Business / Commerce']],
    ['Honours Arts', ['Social Sciences / Humanities']],
    ['Mathematical Economics', ['Computer Science / Math', 'Social Sciences / Humanities']],
    ['Chemistry', ['Physical Sciences / Environment']],
    ['Architecture', ['Arts / Design']],
  ])('%s', (name, fields) => {
    expect(classifyFields(name)).toEqual(fields)
  })
})

describe('nextDate', () => {
  it('returns the next occurrence of a yearly date', () => {
    expect(nextDate('December 1', '2026-10-30')).toBe('2026-12-01')
    expect(nextDate('January 15', '2026-10-30')).toBe('2027-01-15')
    expect(nextDate('January 15', '2027-01-15')).toBe('2027-01-15')
    expect(nextDate('January 15', '2027-01-16')).toBe('2028-01-15')
    expect(nextDate('Smarch 3', '2026-10-30')).toBeNull()
  })
})

describe('slugify', () => {
  it('makes URL-safe ids', () => {
    expect(slugify('Arts & Science (St. George)')).toBe('arts-and-science-st-george')
  })
})
