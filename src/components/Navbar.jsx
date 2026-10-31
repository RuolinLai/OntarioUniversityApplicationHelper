import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { CalendarDays, GraduationCap, LayoutDashboard, Lightbulb, Sparkles, UserRound } from 'lucide-react'
import { logOut, useAuth } from '../hooks/useAuth.jsx'

const links = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/programs', label: 'Programs', icon: GraduationCap },
  { to: '/for-you', label: 'For You', icon: Sparkles },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tips', label: 'Tips', icon: Lightbulb },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

function NavItem({ link, onClick }) {
  const Icon = link.icon
  return (
    <NavLink to={link.to} end={link.end} className={linkClass} onClick={onClick}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {link.label}
    </NavLink>
  )
}

function linkClass({ isActive }) {
  return `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

function UserMenu({ name, email }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close when clicking anywhere outside the menu.
  useEffect(() => {
    if (!open) return
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const initials = (name || email || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={ref} className="relative ml-auto hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2">
            <div className="truncate text-sm font-medium text-slate-900">{name || 'Student'}</div>
            <div className="truncate text-xs text-slate-500">{email}</div>
          </div>
          <Link to="/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Profile
          </Link>
          <Link to="/profile?tab=account" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Account settings
          </Link>
          <Link to="/guide" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            How to use
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              logOut()
            }}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile } = useAuth()
  const name = profile?.displayName || user?.displayName

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span>OntarioU Helper</span>
        </Link>

        <div className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <NavItem key={l.to} link={l} />
          ))}
        </div>

        {user ? (
          <UserMenu name={name} email={user.email} />
        ) : (
          <Link
            to="/login"
            className="ml-auto hidden rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 lg:block"
          >
            Log in
          </Link>
        )}

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
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
        <div className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 lg:hidden">
          {links.map((l) => (
            <NavItem key={l.to} link={l} onClick={() => setOpen(false)} />
          ))}
          {user ? (
            <button
              type="button"
              className={`${linkClass({ isActive: false })} text-left`}
              onClick={() => {
                setOpen(false)
                logOut()
              }}
            >
              Log out{name ? ` (${name})` : ''}
            </button>
          ) : (
            <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
              Log in
            </NavLink>
          )}
        </div>
      )}
    </header>
  )
}
