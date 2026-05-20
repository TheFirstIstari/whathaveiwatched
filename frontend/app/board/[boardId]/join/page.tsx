'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '@/src/module_bindings';
import { getParticipantState, setParticipantState, getIdentityHex, getDisplayName } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
    // If already joined this board, go straight in
    if (getParticipantState(boardId)) {
      router.replace(`/board/${boardId}`);
      return;
    }
    // If they have a display name set, pre-fill it
    const saved = getDisplayName();
    if (saved) setDisplayName(saved);
  }, [boardId, router]);

  const joinBoard = useReducer(reducers.joinBoard);

  if (!inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-red-500">Invalid invite link</h1>
          <p className="text-gray-500 text-sm">This link is missing an invite token.</p>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg space-y-6">
        {reason === 'session_expired' && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            Your session expired. Please rejoin to continue tracking.
          </p>
        )}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Join Board</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a display name to track your watches</p>
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Joining…' : 'Join Board'}
          </Button>
        </form>
        <p className="text-xs text-center text-gray-400">
          No account needed. Your watch state is saved to this device.
        </p>
      </div>
    </div>
  );
}

export default function JoinBoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"><p className="text-gray-400 text-sm">Loading…</p></div>;
  return <JoinBoardPageInner />;
}
