'use client';
import { useSpacetimeDB } from 'spacetimedb/react';

export function ConnectionBanner() {
  const { isActive } = useSpacetimeDB();
  if (isActive) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2.5 bg-[var(--warning)] text-black text-xs py-1.5 font-medium tracking-wide shadow-[var(--shadow-sm)]">
      <span className="w-1.5 h-1.5 rounded-full bg-black/60 animate-pulse" />
      Connecting to server…
    </div>
  );
}
