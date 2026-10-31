// Shared Tailwind classes for form controls on the account pages.
// fieldClass has no width, for inputs that set their own (w-full would win over w-20).
export const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20'

export const inputClass = `w-full ${fieldClass}`

export const primaryButton =
  'rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'

// Parse a 0–100 mark typed by the user. Returns a number, null for empty, or NaN if invalid.
export function parseMark(text) {
  if (text === '' || text == null) return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN
}
