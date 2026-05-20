'use client';

/**
 * "Sign in" = set your display name.
 *
 * No OAuth needed. SpacetimeDB issues an anonymous identity + token on first
 * connection. We just ask for a display name so we can call register_owner.
 * The token is persisted in localStorage by the SpacetimeDB SDK.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIdentityToken, getDisplayName, setDisplayName } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignInPage() {
  const router = useRouter();
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already set up, go to dashboard
    if (getIdentityToken() && getDisplayName()) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter your name to continue'); return; }
    if (trimmed.length > 50) { setError('Name must be 50 characters or fewer'); return; }

    setLoading(true);
    try {
      setDisplayName(trimmed);
      // SpacetimeDB connection + register_owner call happens in the dashboard
      // via the connection hook once bindings are generated.
      router.replace('/');
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-lg space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IHaveWatched</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Collaborative media tracking for watchparties
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            error={error}
            placeholder="e.g. Alice"
            maxLength={50}
            autoFocus
          />
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Setting up…' : 'Get started'}
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400">
          No account needed. Your boards are tied to this device.
        </p>
      </div>
    </div>
  );
}
