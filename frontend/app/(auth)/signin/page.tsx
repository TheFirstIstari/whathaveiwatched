'use client';

/**
 * "Sign in" = set your display name.
 *
 * No OAuth needed. SpacetimeDB issues an anonymous identity + token on first
 * connection. We just ask for a display name so we can call register_owner.
 * The token is persisted in localStorage by the SpacetimeDB SDK.
 *
 * No SpacetimeDB hooks used here — no force-dynamic needed.
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
      router.replace('/');
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="relative flex min-h-screen overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      {/* Centered card */}
      <div className="relative z-10 flex items-center justify-center w-full p-4">
        <div className="w-full max-w-[380px] ui-card p-8 sm:p-10 space-y-8 animate-[fade-in-up_0.5s_ease-out_both]">
          {/* Brand */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--accent)] shadow-[var(--shadow-md)] text-[var(--accent-fg)] text-lg font-bold mb-1" aria-hidden>
              ▸
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              IHaveWatched
            </h1>
            <p className="text-sm text-[var(--text-soft)] leading-relaxed">
              Track shared watch progress<br className="sm:hidden" /> with your friends.
            </p>
          </div>

          {/* Form */}
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

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
            <span>No account</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-dim)] opacity-40" />
            <span>Device-based</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-dim)] opacity-40" />
            <span>Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
