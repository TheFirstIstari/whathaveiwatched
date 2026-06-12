'use client';
import { useState, useEffect } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';

export function ConnectionBanner() {
  const { isActive } = useSpacetimeDB();
  const [visible, setVisible] = useState(false);

  // Delay showing by 300ms to avoid flash on fast reconnects
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setVisible(false), 300);
      setVisible(false);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!visible) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2.5 bg-[var(--warning)]/90 text-[var(--text)] text-xs py-1.5 font-medium tracking-wide shadow-[var(--shadow-sm)] backdrop-blur-sm transition-all">
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-pulse" />
      Connecting to server…
    </div>
  );
}
