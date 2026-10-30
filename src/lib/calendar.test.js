import { describe, it, expect } from 'vitest'
import {
  addDays,
  buildCalendarEvents,
  countdownLabel,
  daysBetween,
  isDateString,
  KIND,
  toFullCalendarEvent,
  upcomingEvents,
} from './calendar.js'
import dates from '../data/dates.json'
import { allPrograms } from './data.js'

const uoftEng = {
  id: 'toronto-st-george-civil-engineering',
  name: 'Civil Engineering',
  campus: 'St. George',
  university: { name: 'University of Toronto', shortName: 'UofT' },
  keyDates: [{ label: 'Engineering Supplemental Application deadline', date: '2027-01-15' }],
}

describe('date helpers', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })

  it('counts days, including across daylight saving', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3) // clocks change Nov 1
    expect(daysBetween('2027-01-15', '2027-01-10')).toBe(-5)
  })

  it('rejects impossible dates', () => {
    expect(isDateString('2027-02-28')).toBe(true)
    expect(isDateString('2027-02-31')).toBe(false)
    expect(isDateString('Jan 15')).toBe(false)
    expect(isDateString(undefined)).toBe(false)
  })

  it('labels countdowns', () => {
    expect(countdownLabel(0)).toBe('Today')
    expect(countdownLabel(1)).toBe('Tomorrow')
    expect(countdownLabel(12)).toBe('In 12 days')
  })
})

describe('buildCalendarEvents', () => {
  const events = buildCalendarEvents({
    ouacDates: [{ label: 'Equal consideration deadline', date: '2027-01-15', type: 'ouac' }],
    programs: [uoftEng],
    userEvents: [
      { id: 'e1', title: 'Waterloo info session', date: '2026-11-05', color: '#059669' },
      { id: 'e2', title: 'Exam week', date: '2027-01-20', endDate: '2027-01-24' },
      { id: 'e3', title: 'Broken', date: '' },
      { id: 'e4', title: 'Backwards', date: '2027-02-10', endDate: '2027-02-01' },
    ],
  })

  it('combines all three sources sorted by date', () => {
    expect(events.map((e) => e.kind)).toEqual(['custom', 'ouac', 'program', 'custom', 'custom'])
    expect(events[0].date).toBe('2026-11-05')
  })

  it('colours each source', () => {
    expect(events.find((e) => e.kind === 'ouac').color).toBe(KIND.ouac.color)
    expect(events.find((e) => e.kind === 'program').color).toBe(KIND.program.color)
    expect(events.find((e) => e.eventId === 'e1').color).toBe('#059669')
    expect(events.find((e) => e.eventId === 'e2').color).toBe(KIND.custom.color)
  })

  it('names the program and campus in its key dates', () => {
    const e = events.find((e) => e.kind === 'program')
    expect(e.title).toBe('UofT St. George Civil Engineering: Engineering Supplemental Application deadline')
    expect(e.programId).toBe(uoftEng.id)
  })

  it('drops events without a valid date and ignores end dates before the start', () => {
    expect(events.some((e) => e.eventId === 'e3')).toBe(false)
    expect(events.find((e) => e.eventId === 'e4').endDate).toBeNull()
  })

  it('gives every event a unique id', () => {
    const ids = events.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('toFullCalendarEvent', () => {
  it('makes the end date exclusive', () => {
    const fc = toFullCalendarEvent({ id: 'x', title: 'Exam week', date: '2027-01-20', endDate: '2027-01-24', color: '#2563eb' })
    expect(fc).toMatchObject({ start: '2027-01-20', end: '2027-01-25', allDay: true })
    expect(toFullCalendarEvent({ id: 'y', title: 'One day', date: '2027-01-20' }).end).toBeUndefined()
  })
})

describe('upcomingEvents', () => {
  const events = [
    { id: 'past', date: '2026-10-01' },
    { id: 'today', date: '2026-10-30' },
    { id: 'ongoing', date: '2026-10-25', endDate: '2026-11-02' },
    { id: 'soon', date: '2026-11-29' },
    { id: 'later', date: '2026-11-30' },
  ]

  it('keeps the next 30 days and counts down', () => {
    const upcoming = upcomingEvents(events, '2026-10-30')
    expect(upcoming.map((e) => e.id)).toEqual(['today', 'ongoing', 'soon'])
    expect(upcoming.map((e) => e.daysLeft)).toEqual([0, 0, 30])
  })
})

describe('calendar data', () => {
  it('dates.json and program key dates use real dates', () => {
    for (const d of dates) expect(isDateString(d.date), d.label).toBe(true)
    for (const p of allPrograms) for (const d of p.keyDates) expect(isDateString(d.date), `${p.id} ${d.label}`).toBe(true)
  })
})
