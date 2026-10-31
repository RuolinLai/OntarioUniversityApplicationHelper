import { ForwardButton } from './LinkButton.jsx'

// Shown when .env.local has no Firebase config, so the site can still be browsed without accounts.
export default function FirebaseMissing() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Accounts aren&apos;t set up</h1>
      <p className="mt-2 text-slate-600">
        This copy of the site has no Firebase configuration, so logging in is turned off. Copy{' '}
        <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
        <code className="rounded bg-slate-100 px-1">.env.local</code> and fill in your Firebase project&apos;s values.
      </p>
      <div className="mt-8">
        <ForwardButton to="/programs">Browse programs</ForwardButton>
      </div>
    </div>
  )
}
