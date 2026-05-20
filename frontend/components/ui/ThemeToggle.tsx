'use client';
import { useTheme } from '@/app/providers';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[var(--radius-sm)]
                  text-[var(--text-dim)] hover:text-[var(--text)]
                  hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)]
                  transition-all duration-150 ${className}`}
    >
      {isDark ? (
        // sun
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        // moon
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
