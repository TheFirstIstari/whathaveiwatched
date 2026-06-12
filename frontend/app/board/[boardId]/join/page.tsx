'use client';

// No SpacetimeDB useTable hooks — only useReducer. No force-dynamic needed.
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '@/src/module_bindings';
import { getParticipantState, setParticipantState, getIdentityHex, getDisplayName } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function JoinBoardPageInner() {
  const router      = useRouter();
  const params      = useParams();
  const searchParams = useSearchParams();
  const boardId     = params.boardId as string;
  const boardIdBig  = BigInt(boardId);
  const inviteToken = searchParams.get('invite') ?? '';
  const reason      = searchParams.get('reason');

  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError]     = useState('');
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (getParticipantState(boardId)) {
      router.replace(`/board/${boardId}`);
      return;
    }
    const saved = getDisplayName();
    if (saved) setDisplayName(saved);
  }, [boardId, router]);

  const joinBoard = useReducer(reducers.joinBoard);

  if (!inviteToken) {
    return (
      <div className="relative flex min-h-screen">
        <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
        <div className="flex items-center justify-center w-full p-4">
          <div className="ui-card p-8 text-center max-w-sm space-y-3">
            <div className="w-10 h-10 rounded-[var(--radius-xl)] bg-[var(--danger-soft)] flex items-center justify-center text-[var(--danger)] mx-auto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
              </svg>
            </div>
            <h1 className="text-base font-semibold text-[var(--danger)]">Invalid invite link</h1>
            <p className="text-sm text-[var(--text-soft)]">This link is missing an invite token. Ask the board owner for a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) { setNameError('Enter a display name'); return; }
    if (name.length > 50) { setNameError('Name must be 50 characters or fewer'); return; }
    setNameError('');
    setLoading(true);
    try {
      await joinBoard({ boardId: boardIdBig, inviteToken, displayName: name });
      setParticipantState(boardId, { displayName: name, joinedAt: Date.now() });
      router.replace(`/board/${boardId}`);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('DUPLICATE_NAME')) setNameError('That name is already taken on this board');
      else if (msg.includes('INVALID_TOKEN')) setNameError('Invalid or expired invite link');
      else if (msg.includes('INVALID_STATE')) setNameError('You have already joined this board');
      else setNameError('Failed to join — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <div className="relative z-10 flex items-center justify-center w-full p-4">
        <div className="w-full max-w-[380px] ui-card p-8 sm:p-10 space-y-7 animate-[fade-in-up_0.5s_ease-out_both]">
          {reason === 'session_expired' && (
            <p className="text-xs text-[var(--warning)] bg-[var(--warning-soft)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)] px-3 py-2">
              Your session expired. Please rejoin to continue tracking.
            </p>
          )}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-xl)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Join board</h1>
            <p className="text-sm text-[var(--text-soft)]">Pick a display name to track your watches.</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              error={nameError}
              placeholder="e.g. Alice"
              maxLength={50}
              autoFocus
            />
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Joining…' : 'Join board'}
            </Button>
          </form>
          <p className="text-[10px] text-center text-[var(--text-dim)] uppercase tracking-wider">
            No account · Device-based · Real-time
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinBoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="flex min-h-screen items-center justify-center"><p className="text-[var(--text-dim)] text-sm">Loading…</p></div>;
  return <JoinBoardPageInner />;
}
