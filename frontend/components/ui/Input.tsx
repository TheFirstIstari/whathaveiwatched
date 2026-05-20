import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="block space-y-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-blue-500
                    ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </label>
  );
}