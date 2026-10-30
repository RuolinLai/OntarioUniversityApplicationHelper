import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router'
import Navbar from './Navbar.jsx'

// Opening a new page starts at the top, like a normal website. Back/forward (POP) is left
// alone so the browser can return you to where you were in a long list.
function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])
  return null
}

const footerLinks = [
  { to: '/programs', label: 'Programs' },
  { to: '/tips', label: 'Tips' },
  { to: '/calendar', label: 'Calendar' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Program information is collected from official university websites and may be out of date. Always confirm
            requirements and deadlines on the university&apos;s site.
          </p>
          <nav className="flex shrink-0 gap-4" aria-label="Footer">
            {footerLinks.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-slate-900">
                {l.label}
              </Link>
            ))}
            <a href="https://www.ouac.on.ca/" target="_blank" rel="noreferrer" className="hover:text-slate-900">
              OUAC ↗
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
