'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, clearIdentityToken } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Inner component — only rendered after client mount, so SpacetimeDB hooks are safe
function DashboardInner() {
  const router = useRouter();
  const [displayName, setDisplayName_] = useState('');
  // Identity is reactive: it's empty until the SDK's onConnect fires, so read it
  // from the live connection (not a one-shot localStorage snapshot at mount) —
  // otherwise registerOwner never runs and createBoard fails NOT_AUTHENTICATED.
  const { identity } = useSpacetimeDB();
  const identityHex = identity?.toHexString() ?? getIdentityHex();

  // Board list controls
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'titles' | 'members'>('recent');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const name = getDisplayName();
    if (!name) { router.replace('/signin'); return; }
    setDisplayName_(name);
  }, [router]);

  const [allBoards]       = useTable(tables.board);
  const [allParticipants] = useTable(tables.participant);
  const [allMediaItems]   = useTable(tables.media_item);
  const [allWatchAggs]    = useTable(tables.watch_aggregate);
  const [allAccounts]     = useTable(tables.account);
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

  // Memoized lookup maps — avoids O(n) filter per board per render
  const itemCountMap = useMemo(() => {
    const m = new Map<bigint, number>();
    allMediaItems.forEach(item => {
      if (item.mediaType === 'FILM' || item.mediaType === 'SHOW') {
        m.set(item.boardId, (m.get(item.boardId) ?? 0) + 1);
      }
    });
    return m;
  }, [allMediaItems]);

  const participantCountMap = useMemo(() => {
    const m = new Map<bigint, number>();
    allParticipants.forEach(p => {
      m.set(p.boardId, (m.get(p.boardId) ?? 0) + 1);
    });
    return m;
  }, [allParticipants]);

  const posterMap = useMemo(() => {
    const m = new Map<bigint, string>();
    allMediaItems.forEach(item => {
      if ((item.mediaType === 'FILM' || item.mediaType === 'SHOW') && item.posterUrl && !m.has(item.boardId)) {
        m.set(item.boardId, item.posterUrl);
      }
    });
    return m;
  }, [allMediaItems]);

  const ownerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    allAccounts.forEach(a => m.set(a.ownerIdentity.toHexString(), a.displayName));
    return m;
  }, [allAccounts]);

  const progressMap = useMemo(() => {
    if (!identityHex) return new Map<bigint, { pct: number; total: number }>();
    const topIds = new Map<bigint, Set<bigint>>();
    allMediaItems.forEach(item => {
      if (item.mediaType === 'FILM' || item.mediaType === 'SHOW') {
        let s = topIds.get(item.boardId);
        if (!s) { s = new Set(); topIds.set(item.boardId, s); }
        s.add(item.id);
      }
    });
    const m = new Map<bigint, { pct: number; total: number }>();
    allWatchAggs.forEach(a => {
      if (a.watcherIdentity.toHexString() !== identityHex) return;
      const ids = topIds.get(a.boardId);
      if (!ids || !ids.has(a.mediaItemId)) return;
      const cur = m.get(a.boardId) ?? { pct: 0, total: 0 };
      cur.total += a.totalCount;
      m.set(a.boardId, { pct: 0, total: cur.total });
    });
    allWatchAggs.forEach(a => {
      if (a.watcherIdentity.toHexString() !== identityHex) return;
      const ids = topIds.get(a.boardId);
      if (!ids || !ids.has(a.mediaItemId)) return;
      const cur = m.get(a.boardId);
      if (!cur) return;
      cur.pct += a.watchedCount;
    });
    const result = new Map<bigint, { pct: number; total: number }>();
    m.forEach((v, k) => {
      const watched = v.pct;
      result.set(k, { pct: v.total > 0 ? Math.round((watched / v.total) * 100) : 0, total: v.total });
    });
    return result;
  }, [allWatchAggs, allMediaItems, identityHex]);

  const itemCountForBoard = (boardId: bigint) => itemCountMap.get(boardId) ?? 0;
  const participantCountForBoard = (boardId: bigint) => participantCountMap.get(boardId) ?? 0;
  const progressForBoard = (boardId: bigint) => progressMap.get(boardId) ?? { pct: 0, total: 0 };
  const posterForBoard = (boardId: bigint) => posterMap.get(boardId) ?? null;
  const ownerForBoard = (board: BoardRow) => ownerNameMap.get(board.ownerIdentity.toHexString()) ?? 'Owner';

  const totalTitles = myBoards.reduce((sum, b) => sum + itemCountForBoard(b.id), 0);
  const totalMembers = myBoards.reduce((sum, b) => sum + participantCountForBoard(b.id), 0);

  const applyControls = (boards: BoardRow[], useVisibility: boolean) => {
    const q = query.trim().toLowerCase();
    let list = boards;
    if (q) {
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    }
    if (useVisibility && visibility !== 'all') {
      list = list.filter(b =>
        visibility === 'public' ? b.sharingMode === 'PUBLIC' : b.sharingMode !== 'PUBLIC');
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name':    return a.title.localeCompare(b.title);
        case 'titles':  return itemCountForBoard(b.id) - itemCountForBoard(a.id);
        case 'members': return participantCountForBoard(b.id) - participantCountForBoard(a.id);
        default:        return Number(b.id - a.id);
      }
    });
    return sorted;
  };

  const visibleMyBoards = applyControls(myBoards, true);
  const visibleJoinedBoards = applyControls(joinedBoards, false);

  return (
    <div className="min-h-screen">
      <ConnectionBanner />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 group">
            <span className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center text-[10px] font-bold">
              ▸
            </span>
            <span className="font-semibold tracking-tight text-[var(--text)] text-sm">
              ihavewatched
            </span>
          </button>
          <div className="flex items-center gap-1.5">
            {displayName && (
              <span className="hidden md:inline-flex items-center text-[11px] text-[var(--text-soft)] px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--surface-2)]">
                {displayName}
              </span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => {
              clearIdentityToken();
              localStorage.removeItem('ihw_display_name');
              const keys: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith('ihw_participant_')) keys.push(k);
              }
              keys.forEach(k => localStorage.removeItem(k));
              router.replace('/signin');
            }}>
              Switch user
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-[fade-in-up_0.4s_ease-out_both]">
        {/* Welcome + Stats row */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text)]">
              Your boards
            </h1>
            <p className="text-sm text-[var(--text-soft)] mt-1">
              Track watch progress with friends.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-[var(--text-dim)]">
              <StatPill label="Boards" value={myBoards.length} />
              <StatPill label="Titles" value={totalTitles} />
              <StatPill label="Members" value={totalMembers} />
            </div>
            <Button size="sm" onClick={() => router.push('/boards/new')}>New board</Button>
          </div>
        </section>

        {/* Controls */}
        {(myBoards.length + joinedBoards.length) > 0 && (
          <Toolbar
            query={query} onQuery={setQuery}
            sortBy={sortBy} onSort={setSortBy}
            visibility={visibility} onVisibility={setVisibility}
            searchRef={searchRef}
          />
        )}

        {/* Board sections */}
        <section className="space-y-8">
          {myBoards.length === 0 ? (
            <EmptyState
              title="Create your first board"
              description="Start with a franchise, movie marathon, or series watchthrough."
              cta={<Button onClick={() => router.push('/boards/new')}>Create board</Button>}
            />
          ) : visibleMyBoards.length === 0 ? (
            <NoMatches onClear={() => { setQuery(''); setVisibility('all'); }} />
          ) : (
            <BoardGrid boards={visibleMyBoards} itemCount={itemCountForBoard} participantCount={participantCountForBoard} progress={progressForBoard} posterForBoard={posterForBoard} ownerForBoard={ownerForBoard} onOpen={id => router.push(`/board/${id}`)} />
          )}

          {joinedBoards.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-2">
                <h2 className="text-sm font-semibold text-[var(--text)]">Joined boards</h2>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
              {visibleJoinedBoards.length === 0 ? (
                <NoMatches onClear={() => { setQuery(''); setVisibility('all'); }} />
              ) : (
                <BoardGrid boards={visibleJoinedBoards} itemCount={itemCountForBoard} participantCount={participantCountForBoard} progress={progressForBoard} posterForBoard={posterForBoard} ownerForBoard={ownerForBoard} onOpen={id => router.push(`/board/${id}`)} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

interface BoardRow {
  id: bigint;
  title: string;
  description: string;
  sharingMode: string;
  ownerIdentity: { toHexString: () => string };
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--surface-2)]">
      <span className="font-medium tabular-nums text-[var(--text)]">{value}</span>
      <span className="text-[var(--text-dim)]">{label}</span>
    </span>
  );
}

type SortBy = 'recent' | 'name' | 'titles' | 'members';
type Visibility = 'all' | 'public' | 'private';

function Toolbar({
  query, onQuery, sortBy, onSort, visibility, onVisibility, searchRef,
}: {
  query: string; onQuery: (v: string) => void;
  sortBy: SortBy; onSort: (v: SortBy) => void;
  visibility: Visibility; onVisibility: (v: Visibility) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const segBtn = (active: boolean) =>
    `px-2.5 py-1.5 text-xs transition-colors ${
      active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-soft)] hover:text-[var(--text)]'
    }`;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="relative flex-1 max-w-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"
             className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          ref={searchRef}
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search boards…"
          className="ui-input !pl-9"
          aria-label="Search boards"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-dim)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] pointer-events-none">/</kbd>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
          {(['all', 'public', 'private'] as Visibility[]).map(v => (
            <button key={v} onClick={() => onVisibility(v)} className={segBtn(visibility === v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => onSort(e.target.value as SortBy)}
          aria-label="Sort boards"
          className="ui-input !py-1.5 !w-auto cursor-pointer"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="titles">Most titles</option>
          <option value="members">Most members</option>
        </select>
      </div>
    </div>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="ui-card flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      <p className="text-sm text-[var(--text-soft)]">No boards match your filters.</p>
      <Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button>
    </div>
  );
}

function EmptyState({ title, description, cta }: { title: string; description: string; cta?: React.ReactNode }) {
  return (
    <div className="ui-card min-h-[16rem] flex flex-col items-center justify-center text-center px-6 py-14 gap-4">
      <div className="w-10 h-10 rounded-[var(--radius-xl)] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
        <p className="text-xs text-[var(--text-soft)] mt-1 max-w-xs">{description}</p>
      </div>
      {cta}
    </div>
  );
}

function BoardGrid({
  boards, itemCount, participantCount, progress, posterForBoard, ownerForBoard, onOpen,
}: {
  boards: BoardRow[];
  itemCount: (id: bigint) => number;
  participantCount: (id: bigint) => number;
  progress: (id: bigint) => { pct: number; total: number };
  posterForBoard: (id: bigint) => string | null;
  ownerForBoard: (board: BoardRow) => string;
  onOpen: (id: bigint) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {boards.map(board => {
        const items = itemCount(board.id);
        const parts = participantCount(board.id);
        const prog = progress(board.id);
        const poster = posterForBoard(board.id);
        const owner = ownerForBoard(board);
        const isPublic = board.sharingMode === 'PUBLIC';
        return (
          <button
            key={String(board.id)}
            onClick={() => onOpen(board.id)}
            className="ui-card-interactive text-left overflow-hidden"
          >
            {/* Poster banner */}
            {poster ? (
              <div className="relative h-24 sm:h-32 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/30 to-transparent" />
                {/* Badge overlay on poster */}
                <span className={`absolute top-2 right-2 ui-badge
                                  ${isPublic
                                    ? 'bg-[var(--accent)]/80 text-[var(--accent-fg)] backdrop-blur-sm'
                                    : 'bg-[var(--surface-solid)]/80 text-[var(--text-dim)] backdrop-blur-sm'}`}>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            ) : (
              <div className="relative h-24 sm:h-32 overflow-hidden"
                   style={{
                     background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 50%, color-mix(in srgb, var(--accent) 60%, var(--bg)) 100%)`
                   }}>
                <span className="text-5xl font-bold text-[var(--accent-fg)] opacity-60 select-none">
                  {board.title.charAt(0).toUpperCase()}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/10 to-transparent" />
                <span className={`absolute top-2 right-2 ui-badge
                                  ${isPublic
                                    ? 'bg-[var(--accent)]/80 text-[var(--accent-fg)] backdrop-blur-sm'
                                    : 'bg-[var(--surface-solid)]/80 text-[var(--text-dim)] backdrop-blur-sm'}`}>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-[var(--text)] truncate text-sm leading-snug">
                {board.title}
              </h3>
              <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                by {owner}
              </p>
              {board.description && (
                <p className="text-xs text-[var(--text-soft)] leading-relaxed line-clamp-2 mt-2">
                  {board.description}
                </p>
              )}
              {/* Progress */}
              {prog.total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Progress</span>
                    <span className="text-[11px] font-medium tabular-nums text-[var(--accent)]">{prog.pct}%</span>
                  </div>
                  <div className="h-1 rounded-[var(--radius-full)] bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-[var(--radius-full)] bg-[var(--accent)] transition-[width] duration-300"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Footer stats */}
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)] mt-3 pt-3 border-t border-[var(--border)]">
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--text-soft)] font-medium tabular-nums">{items}</span>
                  <span>{items === 1 ? 'title' : 'titles'}</span>
                </span>
                <span className="opacity-30">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[var(--text-soft)] font-medium tabular-nums">{parts}</span>
                  <span>{parts === 1 ? 'member' : 'members'}</span>
                </span>
              </div>
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
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl h-12 flex items-center">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
            <div className="h-4 w-28 ui-skeleton" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-6 w-48 ui-skeleton mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="ui-card overflow-hidden">
                <div className="h-32 ui-skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 ui-skeleton" />
                  <div className="h-3 w-1/3 ui-skeleton" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return <DashboardInner />;
}
