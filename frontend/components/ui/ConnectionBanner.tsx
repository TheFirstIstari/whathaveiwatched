'use client';
import { useSpacetimeDB } from 'spacetimedb/react';

export function ConnectionBanner() {
  const { isActive } = useSpacetimeDB();
  if (isActive) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black text-center text-sm py-2 font-medium">
      Connecting to server…
    </div>
  );
}
