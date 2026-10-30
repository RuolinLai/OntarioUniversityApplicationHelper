import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase.js'

const AuthContext = createContext({ user: null, profile: null, loading: false })

// Create users/{uid} the first time someone signs in.
async function ensureUserDoc(user, displayName) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: displayName || user.displayName || '',
      email: user.email,
      createdAt: serverTimestamp(),
      onboardingDone: false,
    })
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // No Firebase config (or server-side rendering in tests) → nothing to wait for.
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) return
    let unsubscribeProfile = () => {}
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      unsubscribeProfile()
      setUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      // Wait for users/{uid} before pages decide where to send the user (e.g. onboarding).
      setLoading(true)
      unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (snap) => {
        setProfile(snap.exists() ? snap.data() : null)
        setLoading(false)
      })
    })
    return () => {
      unsubscribeProfile()
      unsubscribeAuth()
    }
  }, [])

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export async function signUp(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await ensureUserDoc(user, name)
}

export function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(user)
}

export function logOut() {
  return signOut(auth)
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

// Firebase error codes → messages a student can act on.
export function authErrorMessage(error) {
  const messages = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-password': 'Please enter a password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }
  return messages[error?.code] ?? 'Something went wrong. Please try again.'
}
