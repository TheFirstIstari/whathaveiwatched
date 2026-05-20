'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="ui-card p-8 max-w-md w-full text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-[var(--danger-soft)] flex items-center justify-center mx-auto text-[var(--danger)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-semibold text-[var(--text)]">Something went wrong</h1>
          <p className="text-xs text-[var(--text-soft)] font-mono break-words">{error.message}</p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="secondary" size="sm" onClick={reset}>Try again</Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>Go home</Button>
        </div>
      </div>
    </div>
  );
}
