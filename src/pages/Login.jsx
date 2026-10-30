import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { authErrorMessage, logIn, logInWithGoogle, resetPassword, signUp, useAuth } from '../hooks/useAuth.jsx'
import { firebaseConfigured } from '../firebase.js'
import FirebaseMissing from '../components/FirebaseMissing.jsx'
import Spinner from '../components/Spinner.jsx'
import { inputClass, primaryButton, secondaryButton } from '../components/form.js'

// One page for /login and /signup; `mode` picks which form is shown.
export default function Login({ mode = 'login' }) {
  const isSignup = mode === 'signup'
  const { user, loading } = useAuth()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (!firebaseConfigured) return <FirebaseMissing />
  if (loading) return <Spinner />
  // Already signed in (or just signed in): RequireAuth sends new users on to onboarding.
  if (user) return <Navigate to={location.state?.from ?? '/profile'} replace />

  async function run(action) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    run(() => (isSignup ? signUp(name.trim(), email.trim(), password) : logIn(email.trim(), password)))
  }

  function onForgot() {
    if (!email.trim()) {
      setError('Enter your email above first, then click “Forgot password?” again.')
      return
    }
    run(async () => {
      await resetPassword(email.trim())
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`)
    })
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-center text-2xl font-bold text-slate-900">{isSignup ? 'Create your account' : 'Log in'}</h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        {isSignup ? 'Save your courses, marks and favourite programs.' : 'Welcome back!'}
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" className={`${secondaryButton} flex w-full items-center justify-center gap-2`} disabled={busy} onClick={() => run(logInWithGoogle)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {isSignup && (
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input className={`${inputClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input type="email" className={`${inputClass} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              className={`${inputClass} mt-1`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="text-sm text-brand-700">{error}</p>}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}

          <button type="submit" className={`${primaryButton} w-full`} disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        {!isSignup && (
          <button type="button" className="mt-3 text-sm text-slate-500 hover:text-brand-700" onClick={onForgot} disabled={busy}>
            Forgot password?
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <Link to={isSignup ? '/login' : '/signup'} state={location.state} className="font-medium text-brand-700 hover:underline">
          {isSignup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </div>
  )
}
