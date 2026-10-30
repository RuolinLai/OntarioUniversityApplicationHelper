import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx'
import { firebaseConfigured } from '../firebase.js'
import FirebaseMissing from './FirebaseMissing.jsx'
import Spinner from './Spinner.jsx'

// Wraps pages that need an account. Sends logged-out users to /login (and back afterwards),
// and new users to /onboarding until they've finished it.
export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (!firebaseConfigured) return <FirebaseMissing />
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!profile?.onboardingDone && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}
