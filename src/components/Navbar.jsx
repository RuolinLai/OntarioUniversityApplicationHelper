import { useState } from 'react'
import { Link, NavLink } from 'react-router'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/programs', label: 'Programs' },
  { to: '/for-you', label: 'For You' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/tips', label: 'Tips' },
  { to: '/profile', label: 'Profile' },
]

function linkClass({ isActive }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span>OntarioU Helper</span>
        </Link>

        <div className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <Link
          to="/login"
          className="ml-auto hidden rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 md:block"
        >
          Log in
        </Link>

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
            Log in
          </NavLink>
        </div>
      )}
    </header>
  )
}
