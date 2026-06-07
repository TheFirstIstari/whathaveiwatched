'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
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
    setIdentityHex_(getIdentityHex());
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
    // Build top-level ids per board
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
      // Recalc pct at end
      m.set(a.boardId, { pct: 0, total: cur.total });
    });
    // Second pass: compute watched count
    allWatchAggs.forEach(a => {
      if (a.watcherIdentity.toHexString() !== identityHex) return;
      const ids = topIds.get(a.boardId);
      if (!ids || !ids.has(a.mediaItemId)) return;
      const cur = m.get(a.boardId);
      if (!cur) return;
      cur.pct += a.watchedCount; // temporarily store watched sum in pct
    });
    // Finalize pct
    const result = new Map<bigint, { pct: number; total: number }>();
    m.forEach((v, k) => {
      const watched = v.pct; // watched sum was temporarily stored here
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
        default:        return Number(b.id - a.id); // recent: higher id first
      }
    });
    return sorted;
  };

  const visibleMyBoards = applyControls(myBoards, true);
  const visibleJoinedBoards = applyControls(joinedBoards, false);
  const isFiltering = query.trim() !== '' || visibility !== 'all';

  return (
    <div className="min-h-screen">
      <ConnectionBanner />
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center text-xs font-bold">
              ▸
            </span>
            <span className="font-semibold tracking-tight text-[var(--text)] text-sm">
              ihavewatched
            </span>
          </button>
          <div className="flex items-center gap-1.5">
            {displayName && (
              <span className="hidden md:inline-flex items-center text-xs text-[var(--text-soft)] px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--surface-2)]">
                {displayName}
              </span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => {
              clearIdentityToken();
              localStorage.removeItem('ihw_display_name');
              // Clear per-board participant state
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-[fade-in-up_0.4s_ease-out_both]">
        {/* Hero Section */}
        <section className="grid lg:grid-cols-[1fr_22rem] gap-5 mb-10">
          <div className="ui-card p-6 sm:p-8 overflow-hidden relative">
            <div className="relative max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)] mb-3">
                <span className="text-[var(--text-dim)]">❯</span> watchparty boards
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.04] text-[var(--text)] mb-4 tracking-tight">
                Track shared watch progress without spreadsheets.
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-soft)] leading-relaxed max-w-lg">
                Create a board, add movies or shows, invite friends, and see exactly where everyone is in the timeline.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Button size="lg" onClick={() => router.push('/boards/new')}>Create board</Button>
                {myBoards[0] && <Button variant="secondary" size="lg" onClick={() => router.push(`/board/${myBoards[0].id}`)}>Open latest</Button>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
            <StatCard label="Boards" value={myBoards.length} />
            <StatCard label="Titles" value={totalTitles} />
            <StatCard label="Members" value={totalMembers} />
          </div>
        </section>

        {/* Controls — only once there are boards to act on */}
        {(myBoards.length + joinedBoards.length) > 0 && (
          <Toolbar
            query={query} onQuery={setQuery}
            sortBy={sortBy} onSort={setSortBy}
            visibility={visibility} onVisibility={setVisibility}
            searchRef={searchRef}
          />
        )}

        {/* Board sections */}
        <section className="space-y-10">
          <BoardSection
            title="Your boards"
            subtitle="Owned by you"
            action={<Button size="sm" onClick={() => router.push('/boards/new')}>New board</Button>}
          >
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
          </BoardSection>

          {joinedBoards.length > 0 && (
            <BoardSection title="Joined boards" subtitle="Shared with you">
              {visibleJoinedBoards.length === 0 ? (
                <NoMatches onClear={() => { setQuery(''); setVisibility('all'); }} />
              ) : (
                <BoardGrid boards={visibleJoinedBoards} itemCount={itemCountForBoard} participantCount={participantCountForBoard} progress={progressForBoard} posterForBoard={posterForBoard} ownerForBoard={ownerForBoard} onOpen={id => router.push(`/board/${id}`)} />
              )}
            </BoardSection>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="ui-card p-4 sm:p-5">
      <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-[var(--text)] leading-none">{value}</p>
      <p className="text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-dim)] mt-1.5">{label}</p>
    </div>
  );
}

function BoardSection({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text)]">{title}</h2>
          <p className="text-sm text-[var(--text-soft)] mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
      <div className="relative flex-1 max-w-md">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"
             className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          ref={searchRef}
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search boards…  /"
          className="ui-input !pl-9"
          aria-label="Search boards"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
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
    <div className="ui-card min-h-[18rem] flex flex-col items-center justify-center text-center px-6 py-16 gap-5">
      <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-[var(--text)]">{title}</p>
        <p className="text-sm text-[var(--text-soft)] mt-1 max-w-xs">{description}</p>
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
            className="ui-card group text-left transition-all duration-150
                       hover:border-[var(--border-strong)] hover:-translate-y-0.5
                       hover:shadow-[var(--shadow-lg)] cursor-pointer overflow-hidden"
          >
            {/* Poster banner */}
            {poster && (
              <div className="relative h-28 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" />
              </div>
            )}
            <div className={`p-4 sm:p-5 ${poster ? 'pt-2' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-semibold text-[var(--text)] truncate text-sm leading-snug">
                  {board.title}
                </h3>
                <span className={`shrink-0 ui-badge
                                  ${isPublic
                                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                    : 'bg-[var(--surface-2)] text-[var(--text-dim)]'}`}>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] mb-2">
                by {owner}
              </p>
              {board.description ? (
                <p className="text-xs text-[var(--text-soft)] leading-relaxed line-clamp-2 mb-3 min-h-[2rem]">
                  {board.description}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-dim)] italic mb-3 min-h-[2rem]">No description</p>
              )}
              {prog.total > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Your progress</span>
                    <span className="text-[11px] font-medium tabular-nums text-[var(--text-soft)]">{prog.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-[var(--radius-full)] bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-[var(--radius-full)] bg-[var(--accent)] transition-[width] duration-300"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)] pt-2.5 border-t border-[var(--border)]">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)] opacity-60">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8M12 17v4"/>
                  </svg>
                  <span className="text-[var(--text-soft)] font-medium tabular-nums">{items}</span>
                  <span>{items === 1 ? 'title' : 'titles'}</span>
                </span>
                <span className="opacity-30">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)] opacity-60">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
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
