import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './useAuth.jsx'

// Live list of documents in users/{uid}/{name}. Updates as soon as anything is written.
export function useUserCollection(name) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(Boolean(user))

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    return onSnapshot(collection(db, 'users', user.uid, name), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user, name])

  return { items, loading }
}

// Document ids are course codes, so each course appears at most once.
export function useGrade12Courses() {
  return useUserCollection('grade12Courses')
}

export function useGrade11Marks() {
  return useUserCollection('grade11Marks')
}

export function saveGrade12Course(uid, code, data) {
  return setDoc(doc(db, 'users', uid, 'grade12Courses', code), { code, ...data }, { merge: true })
}

export function deleteGrade12Course(uid, code) {
  return deleteDoc(doc(db, 'users', uid, 'grade12Courses', code))
}

// selection: { MCV4U: 'in_progress', ... }. Adds/updates the selected courses (keeping their
// assessments) and removes courses that were unselected, all in one write.
export function saveGrade12Selection(uid, existing, selection) {
  const batch = writeBatch(db)
  for (const [code, status] of Object.entries(selection)) {
    const ref = doc(db, 'users', uid, 'grade12Courses', code)
    if (existing.some((c) => c.code === code)) batch.set(ref, { status }, { merge: true })
    else batch.set(ref, { code, status, finalMark: null, assessments: [] })
  }
  for (const c of existing) {
    if (!(c.code in selection)) batch.delete(doc(db, 'users', uid, 'grade12Courses', c.code))
  }
  return batch.commit()
}

// marks: { MCR3U: 92, ... }. Courses missing from marks are removed.
export function saveGrade11Marks(uid, existing, marks) {
  const batch = writeBatch(db)
  for (const [code, mark] of Object.entries(marks)) {
    batch.set(doc(db, 'users', uid, 'grade11Marks', code), { code, mark })
  }
  for (const g of existing) {
    if (!(g.code in marks)) batch.delete(doc(db, 'users', uid, 'grade11Marks', g.code))
  }
  return batch.commit()
}

// merge: works even if users/{uid} was never created (e.g. a failed first sign-in).
export function updateUserProfile(uid, data) {
  return setDoc(doc(db, 'users', uid), data, { merge: true })
}

export function useEvents() {
  return useUserCollection('events')
}

export function useExtracurriculars() {
  return useUserCollection('extracurriculars')
}

// Add (no id) or update a document in a collection with generated ids, e.g. events.
export function saveUserItem(uid, name, id, data) {
  if (id) return setDoc(doc(db, 'users', uid, name, id), data)
  return addDoc(collection(db, 'users', uid, name), data)
}

export function deleteUserItem(uid, name, id) {
  return deleteDoc(doc(db, 'users', uid, name, id))
}
