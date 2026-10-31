import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx'
import { saveGrade11Marks, saveGrade12Selection, updateUserProfile, useGrade11Marks, useGrade12Courses } from '../hooks/useUserData.js'
import Grade12Picker from '../components/Grade12Picker.jsx'
import Grade11Editor from '../components/Grade11Editor.jsx'
import Spinner from '../components/Spinner.jsx'
import { primaryButton } from '../components/form.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const STEPS = ['Grade 12 courses', 'Grade 11 marks', 'Done']

export default function Onboarding() {
  usePageTitle('Get started')
  const { user, profile } = useAuth()
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(action, nextStep) {
    setError('')
    setSaving(true)
    try {
      await action()
      setStep(nextStep)
      window.scrollTo(0, 0)
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (grade12.loading || grade11.loading) return <Spinner />

  const firstName = (profile?.displayName || user.displayName || '').split(' ')[0]

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">{firstName ? `Welcome, ${firstName}!` : 'Welcome!'}</h1>
      <p className="mt-1 text-slate-600">Tell us about your courses so we can check prerequisites and averages for you.</p>

      <ol className="mt-6 flex gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-700' : 'bg-slate-200'}`} />
            <span className={`mt-2 block text-xs font-medium ${i === step ? 'text-brand-700' : 'text-slate-500'}`}>
              Step {i + 1} · {label}
            </span>
          </li>
        ))}
      </ol>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-8">
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Which Grade 12 U/M courses are you taking?</h2>
            <p className="mt-1 mb-6 text-sm text-slate-600">Include courses you&apos;ve finished, are taking now, or plan to take next semester.</p>
            <Grade12Picker
              existing={grade12.items}
              saving={saving}
              saveLabel="Next"
              onSave={(selection) => save(() => saveGrade12Selection(user.uid, grade12.items, selection), 1)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-slate-900">What were your Grade 11 final marks?</h2>
            <p className="mt-1 mb-6 text-sm text-slate-600">We&apos;ve listed the Grade 11 prerequisites of the courses you picked.</p>
            <Grade11Editor
              grade12Codes={grade12.items.map((c) => c.code)}
              existing={grade11.items}
              hidden={profile?.hiddenGrade11}
              saving={saving}
              saveLabel="Next"
              onBack={() => setStep(0)}
              onSave={(marks, hidden) =>
                save(async () => {
                  await saveGrade11Marks(user.uid, grade11.items, marks)
                  await updateUserProfile(user.uid, { onboardingDone: true, hiddenGrade11: hidden })
                }, 2)
              }
            />
          </>
        )}

        {step === 2 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">You&apos;re all set 🎉</h2>
            <p className="mt-2 text-slate-600">
              You added {grade12.items.length} Grade 12 {grade12.items.length === 1 ? 'course' : 'courses'} and {grade11.items.length} Grade 11{' '}
              {grade11.items.length === 1 ? 'mark' : 'marks'}. You can change these any time in your profile, and log tests and
              assignments to track each course&apos;s average.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/profile" className={primaryButton}>
                Go to my profile
              </Link>
              <Link to="/programs" className="rounded-lg px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                Browse programs
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
