import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium ' +
  'transition-all duration-150 ' +
  'select-none whitespace-nowrap ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--text)] text-[var(--bg)] rounded-[var(--radius-lg)] ' +
    'shadow-[var(--shadow-sm)] ' +
    'hover:brightness-110 hover:shadow-[var(--shadow-md)] ' +
    'active:brightness-95 active:scale-[0.98] ' +
    'dark:bg-[var(--text)] dark:text-[var(--bg)]',
  secondary:
    'bg-[var(--surface-solid)]/80 text-[var(--text)] rounded-[var(--radius-lg)] ' +
    'border border-[var(--border)] ' +
    'shadow-[var(--shadow-xs)] ' +
    'hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] ' +
    'active:scale-[0.98]',
  outline:
    'bg-transparent text-[var(--text)] rounded-[var(--radius-lg)] ' +
    'border border-[var(--border)] ' +
    'hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] ' +
    'active:scale-[0.98]',
  danger:
    'bg-[var(--danger)] text-white rounded-[var(--radius-lg)] ' +
    'shadow-[var(--shadow-sm)] ' +
    'hover:brightness-110 hover:shadow-[var(--shadow-md)] ' +
    'active:brightness-95 active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--text-soft)] rounded-[var(--radius-lg)] ' +
    'hover:text-[var(--text)] hover:bg-[var(--surface-2)] ' +
    'active:bg-[var(--surface-hover)] active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  variant = 'primary', size = 'md', className = '', ...props
}: { variant?: Variant; size?: Size } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
