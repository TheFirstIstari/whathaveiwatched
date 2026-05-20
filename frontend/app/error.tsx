'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="text-gray-500 text-sm">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={reset}>Try again</Button>
          <Button variant="ghost" onClick={() => window.location.href = '/'}>Go home</Button>
        </div>
      </div>
    </div>
  );
}