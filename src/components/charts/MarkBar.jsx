// A mark on a 0–100% scale as a thin bar. Same blues as the dashboard's Top 6 chart:
// real marks in solid blue, Grade 11 estimates in a lighter blue (always labelled "est." in words).
export const MARK_COLOR = '#2a78d6'
export const ESTIMATED_MARK_COLOR = '#86b6ef'

export default function MarkBar({ mark, estimated = false, className = 'h-2', track = 'bg-slate-100' }) {
  return (
    <div className={`relative rounded-full ${track} ${className}`} aria-hidden="true">
      {mark != null && (
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.min(Math.max(mark, 0), 100)}%`, minWidth: 6, background: estimated ? ESTIMATED_MARK_COLOR : MARK_COLOR }}
        />
      )}
    </div>
  )
}
