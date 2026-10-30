import { Link } from 'react-router'

export default function ComingSoon({ title, description }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-6 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">Coming soon</p>
      <div className="mt-8">
        <Link to="/programs" className="font-medium text-brand-700 hover:underline">
          Browse programs in the meantime →
        </Link>
      </div>
    </div>
  )
}
