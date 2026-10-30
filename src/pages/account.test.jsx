import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import courses from '../data/courses.json'
import grade11 from '../data/grade11.json'
import { allPrograms } from '../lib/data.js'
import { buildMarkTable } from '../lib/average.js'
import { assessProgram } from '../lib/recommend.js'

// Pretend Firebase is set up and a student is signed in, with some saved data.
const state = vi.hoisted(() => ({
  profile: { displayName: 'Alex Chen', onboardingDone: true },
  grade12: [
    { id: 'MCV4U', code: 'MCV4U', status: 'in_progress', finalMark: null, assessments: [{ id: 'a', name: 'Unit 1 Test', mark: 45, outOf: 50, weight: 20 }] },
    { id: 'ENG4U', code: 'ENG4U', status: 'completed', finalMark: 91, assessments: [] },
    { id: 'SPH4U', code: 'SPH4U', status: 'next_semester', finalMark: null, assessments: [] },
  ],
  grade11: [
    { id: 'SPH3U', code: 'SPH3U', mark: 87 },
    { id: 'MCR3U', code: 'MCR3U', mark: 93 },
  ],
  favorites: [{ id: 'waterloo-computer-science', addedAt: null }],
}))

vi.mock('../firebase.js', () => ({ firebaseConfigured: true, auth: {}, db: {}, googleProvider: {} }))
vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'alex@example.com', displayName: 'Alex Chen', providerData: [{ providerId: 'password' }] },
    profile: state.profile,
    loading: false,
  }),
  logOut: vi.fn(),
  resetPassword: vi.fn(),
}))
vi.mock('../hooks/useUserData.js', () => ({
  useGrade12Courses: () => ({ items: state.grade12, loading: false }),
  useGrade11Marks: () => ({ items: state.grade11, loading: false }),
  useUserCollection: () => ({ items: [], loading: false }),
  saveGrade12Course: vi.fn(),
  saveGrade12Selection: vi.fn(),
  saveGrade11Marks: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('../hooks/useFavorites.jsx', () => ({
  useFavorites: () => ({ ids: new Set(state.favorites.map((f) => f.id)), items: state.favorites, loading: false }),
  setFavorite: vi.fn(),
  FavoritesProvider: ({ children }) => children,
}))

const { default: App } = await import('../App.jsx')

// React puts <!-- --> between adjacent text pieces; drop them so assertions can match whole phrases.
function render(url) {
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  ).replaceAll('<!-- -->', '')
}

describe('signed-in pages', () => {
  it('profile lists courses with their marks', () => {
    const html = render('/profile')
    expect(html).toContain('Calculus and Vectors')
    expect(html).toContain('90%') // 45/50 from the only assessment
    expect(html).toContain('91%') // ENG4U final mark
    expect(html).toContain('~87% est.') // SPH4U estimated from SPH3U
    expect(html).toContain('Account menu') // navbar shows the user menu
  })

  it('course page shows assessments and the average', () => {
    const html = render('/profile/courses/MCV4U')
    expect(html).toContain('Unit 1 Test')
    expect(html).toContain('Current average')
  })

  it('course page handles a course the user does not take', () => {
    expect(render('/profile/courses/SBI4U')).toContain('isn&#x27;t one of your courses')
  })

  it('profile tabs render', () => {
    expect(render('/profile?tab=grade11')).toContain('Functions')
    expect(render('/profile?tab=account')).toContain('alex@example.com')
  })

  it('onboarding starts with the Grade 12 picker', () => {
    const html = render('/onboarding')
    expect(html).toContain('Welcome, Alex!')
    expect(html).toContain('3 courses selected')
  })

  it('new users are sent to onboarding', () => {
    state.profile = { displayName: 'Alex Chen', onboardingDone: false }
    // <Navigate> renders nothing on the server, so the profile content must be missing.
    expect(render('/profile')).not.toContain('Grade 12 average')
    state.profile = { displayName: 'Alex Chen', onboardingDone: true }
  })

  it('program page shows the student’s match', () => {
    const html = render('/programs/waterloo-computer-science')
    expect(html).toContain('Your match')
    expect(html).toContain('Missing 1 course')
    expect(html).toContain('MHF4U Advanced Functions')
    // (MCV4U 90 + ENG4U 91 + SPH4U ~87 from SPH3U) / 3, within 5 of the 90 low end → reach
    expect(html).toContain('89.3%')
    expect(html).toContain('Reach')
    expect(html).toContain('aria-pressed="true"') // favourited
  })

  it('programs page hides programs the student isn’t eligible for', () => {
    const html = render('/programs')
    expect(html).toContain('hidden based on your courses')
    expect(render('/programs?elig=all')).not.toContain('hidden based on your courses')
  })

  it('profile favourites tab lists hearted programs', () => {
    expect(render('/profile?tab=favourites')).toContain('Computer Science')
    state.favorites = []
    expect(render('/profile?tab=favourites')).toContain('No favourites yet')
    state.favorites = [{ id: 'waterloo-computer-science', addedAt: null }]
  })

  it('for you sorts eligible programs into safety, match and reach', () => {
    const saved = state.grade12
    const marks = { ENG4U: 93, MCV4U: 95, MHF4U: 96, SPH4U: 90, SCH4U: 91, ICS4U: 97 }
    const courses = Object.entries(marks).map(([code, finalMark]) => ({ id: code, code, status: 'completed', finalMark, assessments: [] }))
    state.grade12 = courses
    const html = render('/for-you')
    state.grade12 = saved

    expect(html).toContain('Your top 6 average')
    expect(html).toContain('93.7%')
    expect(html).toContain('Computer Science / Math') // a recommended direction
    for (const label of ['Safety', 'Match', 'Reach']) expect(html).toContain(label)

    // The first program the logic puts in each column (recommended fields only) is on the page.
    const table = buildMarkTable(courses, state.grade11)
    const codes = Object.keys(marks)
    const inFields = allPrograms.filter((p) => p.field.some((f) => ['Engineering', 'Computer Science / Math', 'Physical Sciences / Environment'].includes(f)))
    const assessed = inFields.map((p) => assessProgram(p, codes, table)).filter((a) => a.eligibility.status === 'eligible' && a.category)
    expect(assessed.length).toBeGreaterThan(0)
    for (const category of ['safety', 'match', 'reach']) {
      const top = assessed.filter((a) => a.category === category).sort((a, b) => (category === 'reach' ? 1 : -1) * (a.program.admissionRange.low - b.program.admissionRange.low))[0]
      if (top) expect(html).toContain(top.program.name.replaceAll('&', '&amp;'))
    }
  })

  it('for you asks for courses when there are none', () => {
    const saved = state.grade12
    state.grade12 = []
    expect(render('/for-you')).toContain('to get recommendations')
    state.grade12 = saved
  })

  it('logged-in users visiting /login are redirected', () => {
    expect(render('/login')).not.toContain('Continue with Google')
  })
})

describe('grade 11 data', () => {
  it('every Grade 11 course leads to real Grade 12 courses', () => {
    const codes = new Set(courses.map((c) => c.code))
    for (const c of grade11) {
      for (const code of c.leadsTo) expect(codes.has(code), `${c.code} → ${code}`).toBe(true)
    }
  })
})
