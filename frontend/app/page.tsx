'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, clearIdentityToken } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName_] = useState('');
  const [identityHex, setIdentityHex_] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const name = getDisplayName();
    if (!name) { router.replace('/auth/signin'); return; }
    setDisplayName_(name);
    setIdentityHex_(getIdentityHex());
  }, [router]);

  // Subscribe to all boards (filtered client-side to owner's boards)
  const [allBoards, boardsReady] = useTable(tables.board);
  const createBoard = useReducer(reducers.createBoard);
  const registerOwner = useReducer(reducers.registerOwner);

  // Register owner once connected and identity is known
  useEffect(() => {
    if (!identityHex || !displayName) return;
    // Call register_owner — it's idempotent (upserts on the server)
    registerOwner({ displayName, email: '', avatarUrl: '' }).catch(() => {});
  }, [identityHex, displayName]);

  // Filter boards owned by this identity
  const myBoards = allBoards.filter(b =>
    identityHex && b.ownerIdentity.toHexString() === identityHex
  );

  const handleNewBoard = async (title: string) => {
    try {
      await createBoard({ title, description: '' });
      toast.success(`Board "${title}" created`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create board');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ConnectionBanner />
      <header className="border-b bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">IHaveWatched</h1>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => {
            clearIdentityToken();
            localStorage.removeItem('ihw_display_name');
            router.replace('/auth/signin');
          }}>
            Change name
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Boards</h2>
          <Button onClick={() => router.push('/boards/new')}>+ New Board</Button>
        </div>

        {!boardsReady ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-sm">Loading boards…</p>
          </div>
        ) : myBoards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-sm">No boards yet — create one to get started.</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/boards/new')}>
              Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myBoards.map(board => (
              <button
                key={String(board.id)}
                onClick={() => router.push(`/board/${board.id}`)}
                className="text-left rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
                           p-5 hover:border-blue-400 transition-colors shadow-sm"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{board.title}</h3>
                {board.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <span className={`mt-3 inline-block text-xs px-2 py-0.5 rounded-full
                                  ${board.sharingMode === 'PUBLIC'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {board.sharingMode === 'PUBLIC' ? 'Public' : 'Private'}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}
