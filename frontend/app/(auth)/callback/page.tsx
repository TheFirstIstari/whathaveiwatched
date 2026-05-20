'use client';

/**
 * OAuth callback — not used with anonymous auth.
 * Kept as a redirect safety-net in case old links exist.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500 text-sm">Redirecting…</p>
    </div>
  );
}
