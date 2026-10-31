import { useMemo } from 'react'
import { buildMarkTable, estimateMode } from '../lib/average.js'
import { useAuth } from './useAuth.jsx'
import { useGrade11Marks, useGrade12Courses } from './useUserData.js'

// Everything the eligibility and recommendation logic needs about the signed-in student.
// Logged out → no courses, loading false.
export function useStudent() {
  const { profile } = useAuth()
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()
  const mode = estimateMode(profile?.estimateMode)
  const codes = useMemo(() => grade12.items.map((c) => c.code), [grade12.items])
  const markTable = useMemo(() => buildMarkTable(grade12.items, grade11.items, mode), [grade12.items, grade11.items, mode])
  return { loading: grade12.loading || grade11.loading, codes, markTable, estimateMode: mode }
}
