'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, clearIdentityToken } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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

  const [allBoards]       = useTable(tables.board);
  const [allParticipants] = useTable(tables.participant);
  const [allMediaItems]   = useTable(tables.media_item);
  const registerOwner     = useReducer(reducers.registerOwner);

  useEffect(() => {
    if (!identityHex || !displayName) return;
    registerOwner({ displayName, email: '', avatarUrl: '' }).catch(() => {});
  }, [identityHex, displayName]);

  const myBoards = useMemo(
    () => allBoards.filter(b => identityHex && b.ownerIdentity.toHexString() === identityHex),
    [allBoards, identityHex]
  );

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

  const itemCountForBoard = (boardId: bigint) =>
    allMediaItems.filter(m => m.boardId === boardId && (m.mediaType === 'FILM' || m.mediaType === 'SHOW')).length;

  const participantCountForBoard = (boardId: bigint) =>
    allParticipants.filter(p => p.boardId === boardId).length;

  return (
    <div className="min-h-screen">
      <ConnectionBanner />
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 shadow-[0_8px_22px_-10px_rgba(99,102,241,0.9)]" aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--text)]">IHaveWatched</span>
          </div>
          <div className="flex items-center gap-1">
            {displayName && (
              <span className="hidden sm:inline text-sm text-[var(--text-soft)] mr-2">{displayName}</span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => {
              clearIdentityToken();
              localStorage.removeItem('ihw_display_name');
              router.replace('/signin');
            }}>
              Change name
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* My Boards */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text)]">My Boards</h2>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">Boards you own</p>
            </div>
            <Button size="sm" onClick={() => router.push('/boards/new')}>
              <span className="text-[15px] leading-none -mt-px">+</span> New board
            </Button>
          </div>

          {myBoards.length === 0 ? (
            <EmptyState
              title="No boards yet"
              description="Create your first board to start tracking what you've watched."
              cta={<Button variant="secondary" onClick={() => router.push('/boards/new')}>Create board</Button>}
            />
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
            <div className="mb-5">
              <h2 className="text-base font-semibold text-[var(--text)]">Joined</h2>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">Boards you've been invited to</p>
            </div>
            <BoardGrid
              boards={joinedBoards}
              itemCount={itemCountForBoard}
              participantCount={participantCountForBoard}
              onOpen={id => router.push(`/board/${id}`)}
            />
          </section>
        )}

      </main>

      <footer className="border-t border-[var(--border)] mt-12">
        <div className="max-w-5xl mx-auto px-6 py-5 text-center text-xs text-[var(--text-dim)]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </div>
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

function EmptyState({ title, description, cta }: { title: string; description: string; cta?: React.ReactNode }) {
  return (
    <div className="ui-card border-dashed flex flex-col items-center justify-center text-center px-6 py-16 gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-dim)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text)]">{title}</p>
        <p className="text-xs text-[var(--text-soft)] mt-1">{description}</p>
      </div>
      {cta}
    </div>
  );
}

function BoardGrid({
  boards, itemCount, participantCount, onOpen,
}: {
  boards: BoardRow[];
  itemCount: (id: bigint) => number;
  participantCount: (id: bigint) => number;
  onOpen: (id: bigint) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {boards.map(board => {
        const items = itemCount(board.id);
        const parts = participantCount(board.id);
        const isPublic = board.sharingMode === 'PUBLIC';
        return (
          <button
            key={String(board.id)}
            onClick={() => onOpen(board.id)}
            className="ui-card group text-left p-4 transition-all duration-150
                       hover:border-[var(--border-strong)] hover:-translate-y-px
                       hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]
                       dark:hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-medium text-[var(--text)] truncate text-sm leading-snug">
                {board.title}
              </h3>
              <span className={`shrink-0 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded
                                ${isPublic
                                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                  : 'bg-[var(--surface-2)] text-[var(--text-dim)]'}`}>
                {isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            {board.description ? (
              <p className="text-xs text-[var(--text-soft)] line-clamp-2 mb-3 min-h-[2rem]">
                {board.description}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-dim)] italic mb-3 min-h-[2rem]">No description</p>
            )}
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)] pt-2 border-t border-[var(--border)]">
              <span className="inline-flex items-center gap-1">
                <span className="text-[var(--text-soft)] font-medium tabular-nums">{items}</span>
                <span>{items === 1 ? 'title' : 'titles'}</span>
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[var(--text-soft)] font-medium tabular-nums">{parts}</span>
                <span>{parts === 1 ? 'member' : 'members'}</span>
              </span>
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
      <div className="min-h-screen">
        <header className="border-b border-[var(--border)] h-14 flex items-center">
          <div className="max-w-5xl mx-auto px-6 w-full">
            <div className="h-5 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="h-5 w-32 bg-[var(--surface-2)] rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="ui-card p-4 h-[120px] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return <DashboardInner />;
}
