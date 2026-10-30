// "90–96%" / "90%+" / "Not published"
export function formatRange(range) {
  if (!range || range.low == null) return 'Not published'
  if (range.high == null || range.high === range.low) return `${range.low}%+`
  return `${range.low}–${range.high}%`
}
