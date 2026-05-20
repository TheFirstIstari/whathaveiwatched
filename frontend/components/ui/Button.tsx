import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium ' +
  'rounded-lg transition-[background-color,border-color,color,box-shadow] duration-100 ' +
  'select-none whitespace-nowrap ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:opacity-90',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
  outline:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90 active:opacity-80',
  ghost:
    'bg-transparent text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  variant = 'primary', size = 'md', className = '', ...props
}: { variant?: Variant; size?: Size } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
