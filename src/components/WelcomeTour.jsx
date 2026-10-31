import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, CalendarDays, CircleHelp, ClipboardList, GraduationCap, Lightbulb, Rocket, Sparkles } from 'lucide-react'

// First-visit walkthrough. It opens by itself once per browser; it closes from the last step or
// with Skip. The guide page can open it again.

const SEEN_KEY = 'tourSeen'
const OPEN_EVENT = 'open-tour'

// Screenshots live in public/guide/<id>.png. Until one exists, the step shows its icon instead.
const steps = [
  {
    id: 'welcome',
    icon: Rocket,
    title: 'Welcome to OntarioU Helper',
    text: 'Find Ontario university programs you qualify for, see how your marks compare, and keep track of deadlines. Here is a quick tour.',
  },
  {
    id: 'programs',
    icon: GraduationCap,
    title: 'Search programs',
    text: 'Search by name and filter by university, field, co-op or supplementary application. Tap the heart to add a program to your interested programs.',
  },
  {
    id: 'for-you',
    icon: Sparkles,
    title: 'Safety, match and reach',
    text: 'After you sign up and enter your courses, For You sorts the programs you qualify for by how your average compares with past admission ranges.',
  },
  {
    id: 'courses',
    icon: BookOpen,
    title: 'Your courses',
    text: 'Profile → Courses lists your Grade 12 courses with their current marks. Add or remove courses here, and choose how courses without marks yet count towards your averages.',
  },
  {
    id: 'marks',
    icon: ClipboardList,
    title: 'Track your marks',
    text: 'Log tests and assignments for each Grade 12 course. Each program’s admission average is worked out from its own required courses.',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    title: 'Never miss a deadline',
    text: 'Dates from your interested programs show up on your calendar, and you can add your own events.',
  },
  {
    id: 'tips',
    icon: Lightbulb,
    title: 'Learn from other applicants',
    text: 'Tips covers interviews, supplementary applications, averages and offers — general advice plus summaries of Reddit posts from real applicants. Filter by category, source or university.',
  },
  {
    id: 'guide',
    icon: CircleHelp,
    title: 'Need help later?',
    text: 'Click “How to use” at the bottom of any page (or in your account menu once you sign in) for the full guide. You can replay this tour from there too.',
  },
]

// Lets the guide page reopen the tour.
export function openTour() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

// Every step uses the same box, so the dialog keeps its size while moving between steps.
// status: 'loaded' shows the screenshot; anything else (still loading, missing) shows the icon.
function StepPicture({ step, status }) {
  const Icon = step.icon
  return (
    <div className="flex aspect-[16/10] max-h-[62vh] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-brand-50 text-brand-700">
      {status === 'loaded' ? (
        <img src={`/guide/${step.id}.png`} alt="" className="h-full w-full bg-slate-50 object-contain" />
      ) : (
        <Icon className="h-24 w-24" aria-hidden="true" />
      )}
    </div>
  )
}

export default function WelcomeTour() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  // id → 'loaded' | 'failed'. All screenshots load as soon as the tour opens, so pressing Next
  // switches to a picture that is already there instead of a blank one.
  const [pictures, setPictures] = useState({})
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const last = index === steps.length - 1

  // Checked after mounting, since localStorage only exists in the browser.
  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setOpen(true)
    const reopen = () => {
      setIndex(0)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  useEffect(() => {
    if (!open) return
    for (const step of steps) {
      const img = new Image()
      img.onload = () => setPictures((p) => ({ ...p, [step.id]: 'loaded' }))
      img.onerror = () => setPictures((p) => ({ ...p, [step.id]: 'failed' }))
      img.src = `/guide/${step.id}.png`
    }
  }, [open])

  // Arrow keys move between steps; Escape skips. The page behind doesn't scroll.
  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      if (e.key === 'Escape') finish()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open])

  function finish() {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  if (!open) return null
  const step = steps[index]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome tour"
        className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl outline-none sm:p-6"
      >
        <StepPicture step={step} status={pictures[step.id]} />

        <p className="mt-5 text-sm font-medium text-slate-500">
          Step {index + 1} of {steps.length}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{step.title}</h2>
        <p className="mt-2 min-h-[5rem] max-w-3xl leading-relaxed text-slate-600">{step.text}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand-700' : i < index ? 'w-1.5 bg-brand-200' : 'w-1.5 bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {!last && (
              <button type="button" onClick={finish} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                Skip
              </button>
            )}
            {last && (
              <button
                type="button"
                onClick={() => {
                  finish()
                  navigate('/guide')
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Open the guide
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setIndex(index + 1))}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              {last ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
