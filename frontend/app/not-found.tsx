import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-semibold text-[var(--text)] tracking-tight tabular-nums">404</h1>
        <p className="text-sm text-[var(--text-soft)]">This page doesn't exist.</p>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline mt-1">
          ← Go home
        </Link>
      </div>
    </div>
  );
}
