import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  Heart,
  Info,
  Lightbulb,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { GRADE12_PENALTY } from '../lib/average.js'
import { MATCH_MARGIN, REACH_GAP } from '../lib/recommend.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { openTour } from '../components/WelcomeTour.jsx'
import { primaryButton, secondaryButton } from '../components/form.js'

const linkClass = 'font-medium text-brand-700 hover:underline'

function A({ to, children }) {
  return (
    <Link to={to} className={linkClass}>
      {children}
    </Link>
  )
}

// A numbered step in "Getting started".
function StepCard({ n, title, children }) {
  return (
    <li className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{n}</span>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
    </li>
  )
}

// Safety / match / reach explained side by side.
function TierCard({ icon: Icon, name, tone, children }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {name}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  )
}

// A highlighted question and answer inside a section.
function Callout({ title, children }) {
  return (
    <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  )
}

// A label with its explanation, used for filter options.
function OptionRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
      <span className="shrink-0 font-medium text-slate-900 sm:w-48">{label}</span>
      <span className="text-slate-600">{children}</span>
    </div>
  )
}

const sections = [
  {
    id: 'start',
    icon: Rocket,
    tone: 'bg-brand-50 text-brand-700',
    title: 'Getting started',
    body: (
      <>
        <p>
          You can browse <A to="/programs">Programs</A> and <A to="/tips">Tips</A> without an account. To see which programs you
          qualify for, <A to="/signup">sign up</A> with email or Google. Setup takes three steps:
        </p>
        <ol className="grid gap-3 sm:grid-cols-3">
          <StepCard n={1} title="Pick your Grade 12 courses">
            Every U/M course you have taken, are taking or plan to take.
          </StepCard>
          <StepCard n={2} title="Enter Grade 11 marks">
            Used to estimate Grade 12 courses that have no marks yet.
          </StepCard>
          <StepCard n={3} title="You're done">
            Your dashboard shows your top 6 average, upcoming dates and shortcuts.
          </StepCard>
        </ol>
        <p>
          You can change all of this later on your <A to="/profile">Profile</A>.
        </p>
      </>
    ),
  },
  {
    id: 'programs',
    icon: GraduationCap,
    tone: 'bg-sky-50 text-sky-700',
    title: 'Finding programs',
    body: (
      <>
        <p>
          <A to="/programs">Programs</A> lists programs from Ontario universities. Search by name, then narrow the list by university,
          field, co-op and whether a supplementary application (AIF, interview, portfolio…) is needed.
        </p>
        <p>Once you are signed in and have entered courses, each card shows whether you qualify, and an extra filter appears:</p>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
          <OptionRow label="Missing at most 1 course">The default. Hides programs you are 2 or more courses short of.</OptionRow>
          <OptionRow label="Fully eligible only">Only programs whose required courses you all have.</OptionRow>
          <OptionRow label="All programs">Everything, whether you qualify or not.</OptionRow>
        </div>
        <p>
          Open a program to see its prerequisites, past admission range, your admission average for it, key dates, and the same
          subject at other universities. Tap the <Heart className="inline h-4 w-4 align-[-3px] text-rose-500" aria-label="heart" />{' '}
          to add it to your interested programs.
        </p>
      </>
    ),
  },
  {
    id: 'for-you',
    icon: Sparkles,
    tone: 'bg-violet-50 text-violet-700',
    title: 'For You: safety, match and reach',
    body: (
      <>
        <p>
          <A to="/for-you">For You</A> recommends fields based on your courses and sorts the programs you qualify for by comparing your
          admission average with the top of each program&apos;s past admission range:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <TierCard icon={ShieldCheck} name="Safety" tone="border-emerald-200 bg-emerald-50/60 text-emerald-700">
            More than {MATCH_MARGIN} point above the top of the range. Programs with a supplementary application are never marked
            safety.
          </TierCard>
          <TierCard icon={Target} name="Match" tone="border-sky-200 bg-sky-50/60 text-sky-700">
            Within {MATCH_MARGIN} point of the top of the range.
          </TierCard>
          <TierCard icon={TrendingUp} name="Reach" tone="border-amber-200 bg-amber-50/60 text-amber-700">
            Below that, but no more than {REACH_GAP} points under the bottom of the range.
          </TierCard>
        </div>
        <p>Programs without a published range, and programs you are 1 course short of, are listed separately.</p>
      </>
    ),
  },
  {
    id: 'marks',
    icon: ClipboardList,
    tone: 'bg-emerald-50 text-emerald-700',
    title: 'Tracking your marks',
    body: (
      <>
        <p>
          On <A to="/profile">Profile → Courses</A>, click a course to log its tests and assignments with their weights. The site works
          out the weighted average. Once you have the final mark, enter it and it will be used instead.
        </p>
        <p>
          For courses with no Grade 12 marks yet, choose how they count at the bottom of the Courses tab: use the Grade 11 prerequisite
          mark, use it minus {GRADE12_PENALTY} (Grade 12 is usually harder), or leave those courses out. Estimated marks are labelled
          &ldquo;est.&rdquo; or marked with *.
        </p>
        <Callout title="Why is my average different for each program?">
          Universities count a program&apos;s required courses first, even if they are not your best marks, then fill up to 6 courses
          with your highest other marks. So a program that requires your weaker subjects gives a lower average. Each program page lists
          the 6 courses it used.
        </Callout>
      </>
    ),
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    tone: 'bg-rose-50 text-rose-700',
    title: 'Calendar and deadlines',
    body: (
      <>
        <p>
          Key dates of your interested programs appear on the <A to="/calendar">Calendar</A> automatically — click one to open its
          program. Click any day to add your own event, such as an info session or a test. Upcoming dates also show on your dashboard.
        </p>
        <p>Not every university publishes dates for each program, so always check the official site too.</p>
      </>
    ),
  },
  {
    id: 'activities',
    icon: Trophy,
    tone: 'bg-amber-50 text-amber-700',
    title: 'Extracurriculars',
    body: (
      <p>
        Keep a list of clubs, jobs, volunteering and awards on <A to="/profile?tab=extracurriculars">Profile → Extracurriculars</A>.
        It is handy when you write a supplementary application (AIF) and need to remember what you did and when.
      </p>
    ),
  },
  {
    id: 'tips',
    icon: Lightbulb,
    tone: 'bg-yellow-50 text-yellow-700',
    title: 'Tips',
    body: (
      <p>
        <A to="/tips">Tips</A> has advice on interviews, supplementary applications, averages and offers — both general advice and
        summaries of Reddit posts from real applicants. Filter by category, source or university, or search.
      </p>
    ),
  },
  {
    id: 'faq',
    icon: CircleHelp,
    tone: 'bg-slate-100 text-slate-700',
    title: 'Good to know',
    body: (
      <ul className="space-y-2.5">
        {[
          'Program information is collected from official university websites and refreshed every week.',
          <>
            Requirements and admission ranges can change. Always confirm on the university&apos;s website before you apply, and apply
            through{' '}
            <a href="https://www.ouac.on.ca/" target="_blank" rel="noreferrer" className={linkClass}>
              OUAC
            </a>
            .
          </>,
          <>
            &ldquo;Check requirements&rdquo; means the site couldn&apos;t read that program&apos;s prerequisites — look them up on the
            official page.
          </>,
          'Past admission ranges are not guarantees. Treat safety, match and reach as a rough guide.',
        ].map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
]

// Highlights the section currently in view in the side menu.
function useActiveSection() {
  const [active, setActive] = useState(sections[0].id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) setActive(visible[0].target.id)
      },
      // A section counts as "current" while it crosses the upper part of the screen.
      { rootMargin: '-96px 0px -60% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

export default function Guide() {
  usePageTitle('How to use')
  const active = useActiveSection()

  return (
    <div>
      <header className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-8">
        <p className="text-sm font-medium text-brand-700">Guide</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">How to use OntarioU Helper</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Everything the site can do, from finding programs you qualify for to keeping track of deadlines. Jump to a section or read
          it top to bottom.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={openTour} className={`${primaryButton} flex items-center gap-2`}>
            <PlayCircle className="h-4 w-4" aria-hidden="true" /> Replay the welcome tour
          </button>
          <Link to="/programs" className={`${secondaryButton} flex items-center gap-2`}>
            Browse programs <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Phones and tablets: a row of chips. */}
      <nav aria-label="On this page" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Desktop: a side menu that stays in view. */}
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">On this page</p>
            <ul className="mt-2 space-y-0.5">
              {sections.map(({ id, icon: Icon, title }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={active === id ? 'location' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active === id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="max-w-3xl space-y-6">
          {sections.map(({ id, icon: Icon, tone, title, body }, i) => (
            <section key={id} id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium tabular-nums text-slate-400">{String(i + 1).padStart(2, '0')}</p>
                  <h2 className="text-lg font-semibold leading-tight text-slate-900">{title}</h2>
                </div>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">{body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
