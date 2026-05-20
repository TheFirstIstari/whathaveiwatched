import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-muted)] tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`ui-input ${error ? '!border-[var(--danger)] focus:!border-[var(--danger)]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {!error && hint && <p className="text-xs text-[var(--text-dim)]">{hint}</p>}
    </div>
  );
}
