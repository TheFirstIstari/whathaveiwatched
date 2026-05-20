import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-2xl ' +
  'transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ' +
  'select-none whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--text)] text-[var(--bg)] border border-transparent shadow-[var(--shadow-sm)] hover:opacity-90',
  secondary:
    'bg-[var(--surface-solid)]/80 text-[var(--text)] border border-[var(--border)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
  outline:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
  danger:
    'bg-[var(--danger)] text-white border border-transparent shadow-[var(--shadow-sm)] hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
};

export function Button({
  variant = 'primary', size = 'md', className = '', ...props
}: { variant?: Variant; size?: Size } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
