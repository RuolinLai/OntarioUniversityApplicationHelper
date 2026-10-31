// A one-line picture of an admission range on a percentage scale, with an optional
// marker for the student's own average. Used on program cards, the program page and
// the "compare" list. Colours were checked with the data-viz validator (colour-blind
// safe): teal = admission range, orange = your average. The teal is the site's
// #03708d nudged slightly more saturated so it doesn't read as grey in a chart.

export const RANGE_COLOR = '#007596'
export const RANGE_OPEN_COLOR = '#80b0b4' // "80%+" ranges with no published top (palette sage)
export const MUTED_RANGE_COLOR = '#c3c2b7' // other programs when one is highlighted
export const YOU_COLOR = '#eb6834'

const pct = (value, [min, max]) => `${((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100}%`

export function rangeLabel(range) {
  if (range?.low == null) return 'No published average'
  return range.high != null && range.high !== range.low ? `${range.low}–${range.high}%` : `${range.low}%+`
}

/**
 * @param range   { low, high } admission range (high may be null = "low%+")
 * @param you     the student's average, or null
 * @param domain  [min, max] of the scale
 * @param size    'sm' (thin, no ticks) | 'md' (ticks and labels)
 * @param muted   draw the range in grey (for context rows)
 */
export default function RangeBar({ range, you = null, domain = [60, 100], size = 'sm', muted = false }) {
  if (range?.low == null) return null
  const open = range.high == null || range.high === range.low
  const color = muted ? MUTED_RANGE_COLOR : open ? RANGE_OPEN_COLOR : RANGE_COLOR
  const end = open ? domain[1] : range.high
  const height = size === 'md' ? 'h-2.5' : 'h-1.5'
  const label = `Admission range ${rangeLabel(range)}${you != null ? `, your average ${Math.round(you * 10) / 10}%` : ''}`
  const ticks = []
  for (let t = Math.ceil(domain[0] / 10) * 10; t <= domain[1]; t += 10) ticks.push(t)

  return (
    <div role="img" aria-label={label} title={label} className={size === 'md' ? 'pb-6 pt-7' : 'py-1.5'}>
      <div className={`relative ${height} rounded-full bg-slate-100`}>
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: pct(range.low, domain),
            right: `calc(100% - ${pct(end, domain)})`,
            background: open && !muted ? `linear-gradient(to right, ${RANGE_COLOR}, ${RANGE_OPEN_COLOR}00)` : color,
            minWidth: 6,
          }}
        />
        {you != null && (
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(you, domain) }}>
            <div className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ background: YOU_COLOR }} />
            {size === 'md' && (
              <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-slate-900">
                You {Math.round(you * 10) / 10}%
              </div>
            )}
          </div>
        )}
        {size === 'md' &&
          ticks.map((t) => (
            <span
              key={t}
              className="absolute top-full mt-1.5 -translate-x-1/2 text-[11px] tabular-nums text-slate-400"
              style={{ left: pct(t, domain) }}
            >
              {t}
            </span>
          ))}
      </div>
    </div>
  )
}

/** A scale that fits every range (and the student's average), rounded out to 5s. */
export function domainFor(ranges, you = null) {
  const lows = ranges.filter((r) => r?.low != null).map((r) => r.low)
  if (you != null) lows.push(you)
  const min = lows.length ? Math.min(...lows) : 60
  return [Math.max(0, Math.min(70, Math.floor((min - 5) / 5) * 5)), 100]
}
