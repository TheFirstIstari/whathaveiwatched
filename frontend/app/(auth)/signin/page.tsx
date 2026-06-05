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
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-3 right-3"><ThemeToggle /></div>
      <div className="w-full max-w-sm ui-card p-8 space-y-7">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 mb-1">
            <span className="w-8 h-8 rounded-[var(--radius-lg)] bg-[var(--accent)] shadow-[var(--shadow-md)]" aria-hidden />
            <span className="text-lg font-semibold tracking-tight text-[var(--text)]">IHaveWatched</span>
          </div>
          <p className="text-[var(--text-soft)] text-sm">
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

        <p className="text-xs text-center text-[var(--text-dim)] leading-relaxed">
          No account needed.<br/>Your boards are tied to this device.
        </p>
      </div>
    </div>
  );
}
