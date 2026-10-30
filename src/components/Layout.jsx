import { Outlet } from 'react-router'
import Navbar from './Navbar.jsx'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 sm:px-6">
          Program information is collected from official university websites and may be out of date.
          Always confirm requirements and deadlines on the university&apos;s site.
        </div>
      </footer>
    </div>
  )
}
