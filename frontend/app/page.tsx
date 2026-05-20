'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, clearIdentityToken } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { toast } from 'sonner';

// Inner component — only rendered after client mount, so SpacetimeDB hooks are safe
function DashboardInner() {
  const router = useRouter();
  const [displayName, setDisplayName_] = useState('');
  const [identityHex, setIdentityHex_] = useState<string | null>(null);

  useEffect(() => {
    const name = getDisplayName();
    if (!name) { router.replace('/signin'); return; }
    setDisplayName_(name);
    setIdentityHex_(getIdentityHex());
  }, [router]);

  const [allBoards]      = useTable(tables.board);
  const [allParticipants] = useTable(tables.participant);
  const [allMediaItems]   = useTable(tables.media_item);
  const registerOwner    = useReducer(reducers.registerOwner);

  useEffect(() => {
    if (!identityHex || !displayName) return;
    registerOwner({ displayName, email: '', avatarUrl: '' }).catch(() => {});
  }, [identityHex, displayName]);

  const myBoards = useMemo(
    () => allBoards.filter(b => identityHex && b.ownerIdentity.toHexString() === identityHex),
    [allBoards, identityHex]
  );

  // Boards the user has joined as a participant (not owner)
  const joinedBoardIds = useMemo(
    () => new Set(
      allParticipants
        .filter(p => identityHex && p.participantIdentity.toHexString() === identityHex)
        .map(p => p.boardId)
    ),
    [allParticipants, identityHex]
  );
  const joinedBoards = useMemo(
    () => allBoards.filter(b => joinedBoardIds.has(b.id)),
    [allBoards, joinedBoardIds]
  );

  // Helpers for card stats
  const itemCountForBoard = (boardId: bigint) =>
    allMediaItems.filter(m => m.boardId === boardId && (m.mediaType === 'FILM' || m.mediaType === 'SHOW')).length;

  const participantCountForBoard = (boardId: bigint) =>
    allParticipants.filter(p => p.boardId === boardId).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ConnectionBanner />
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">IHaveWatched</span>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => {
            clearIdentityToken();
            localStorage.removeItem('ihw_display_name');
            router.replace('/signin');
          }}>
            Change name
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* My Boards */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Boards</h2>
            <Button size="sm" onClick={() => router.push('/boards/new')}>+ New Board</Button>
          </div>

          {myBoards.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-14 text-center">
              <p className="text-gray-400 text-sm mb-4">No boards yet — create one to get started.</p>
              <Button variant="secondary" onClick={() => router.push('/boards/new')}>
                Create your first board
              </Button>
            </div>
          ) : (
            <BoardGrid
              boards={myBoards}
              itemCount={itemCountForBoard}
              participantCount={participantCountForBoard}
              onOpen={id => router.push(`/board/${id}`)}
            />
          )}
        </section>

        {/* Joined Boards */}
        {joinedBoards.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Joined Boards</h2>
            <BoardGrid
              boards={joinedBoards}
              itemCount={itemCountForBoard}
              participantCount={participantCountForBoard}
              onOpen={id => router.push(`/board/${id}`)}
              dimOwner
            />
          </section>
        )}

      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100 dark:border-gray-800">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}

interface BoardRow {
  id: bigint;
  title: string;
  description: string;
  sharingMode: string;
}

function BoardGrid({
  boards, itemCount, participantCount, onOpen, dimOwner = false,
}: {
  boards: BoardRow[];
  itemCount: (id: bigint) => number;
  participantCount: (id: bigint) => number;
  onOpen: (id: bigint) => void;
  dimOwner?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {boards.map(board => {
        const items = itemCount(board.id);
        const parts = participantCount(board.id);
        return (
          <button
            key={String(board.id)}
            onClick={() => onOpen(board.id)}
            className="text-left rounded-2xl border bg-white dark:bg-gray-900
                       border-gray-200 dark:border-gray-800
                       p-5 hover:border-blue-400 dark:hover:border-blue-500
                       hover:shadow-md transition-all duration-150 group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {board.title}
              </h3>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                                ${board.sharingMode === 'PUBLIC'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                {board.sharingMode === 'PUBLIC' ? 'Public' : 'Private'}
              </span>
            </div>
            {board.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {board.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              {items > 0 && (
                <span>{items} {items === 1 ? 'title' : 'titles'}</span>
              )}
              {parts > 0 && (
                <span>{parts} {parts === 1 ? 'participant' : 'participants'}</span>
              )}
              {items === 0 && parts === 0 && (
                <span>Empty</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Outer shell — safe to render on SSR. Shows a skeleton until client mounts.
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </header>
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return <DashboardInner />;
}
