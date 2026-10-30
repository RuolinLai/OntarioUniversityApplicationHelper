import { useState } from 'react'

// Wraps a Firestore write with a "saving" flag and a friendly error message.
// run() resolves to true if the write succeeded.
export function useSaver() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function run(action) {
    setError('')
    setSaving(true)
    try {
      await action()
      return true
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
      return false
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, run }
}
