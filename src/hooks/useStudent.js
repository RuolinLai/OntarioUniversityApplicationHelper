import { useMemo } from 'react'
import { buildMarkTable } from '../lib/average.js'
import { useGrade11Marks, useGrade12Courses } from './useUserData.js'

// Everything the eligibility and recommendation logic needs about the signed-in student.
// Logged out → no courses, loading false.
export function useStudent() {
  const grade12 = useGrade12Courses()
  const grade11 = useGrade11Marks()
  const codes = useMemo(() => grade12.items.map((c) => c.code), [grade12.items])
  const markTable = useMemo(() => buildMarkTable(grade12.items, grade11.items), [grade12.items, grade11.items])
  return { loading: grade12.loading || grade11.loading, codes, markTable }
}
