// A number in a card, e.g. "Interested programs  4". icon: optional lucide-react icon.
export default function Stat({ label, value, hint, icon: Icon, tone = 'bg-slate-100 text-slate-600' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
