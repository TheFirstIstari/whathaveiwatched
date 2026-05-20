import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-semibold text-[var(--text)] tracking-tight tabular-nums">404</h1>
        <p className="text-sm text-[var(--text-soft)]">This page doesn&apos;t exist.</p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors mt-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Go home
        </Link>
      </div>
    </div>
  );
}
