import { Link } from 'react-router'
import { usePageTitle } from '../hooks/usePageTitle.js'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">We couldn&apos;t find what you were looking for.</p>
      <Link to="/programs" className="mt-8 inline-block font-medium text-brand-700 hover:underline">
        Go to programs →
      </Link>
    </div>
  )
}
