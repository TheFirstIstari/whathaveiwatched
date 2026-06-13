'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, getParticipantState } from '@/lib/db/connection';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Konva from 'konva';
import { BoardCanvas, type BoardMediaItem, type BoardParticipant, type WatchEntryData, type WatchAggData, type FitViewFn } from '@/components/canvas/BoardCanvas';
import { AddMediaSearch } from '@/components/board/AddMediaSearch';
import { importMedia } from '@/lib/db/importMedia';
import { useTheme } from '@/app/providers';
import { useSpacetimeDB } from 'spacetimedb/react';
import { getZoomLevel } from '@/lib/canvas/layout';
import { toast } from 'sonner';

function BoardPageInner() {
  const router    = useRouter();
  const params    = useParams();
  const searchParams = useSearchParams();
  const boardId   = BigInt(params.boardId as string);
  const isPublicView = searchParams.get('view') === 'public';
  const { theme } = useTheme();
  const { getConnection, identity } = useSpacetimeDB();
  // Reactive identity — empty until the SDK connects, so don't snapshot it once.
  const identityHex = identity?.toHexString() ?? getIdentityHex();

  const [authMode, setAuthMode]         = useState<'owner' | 'participant' | 'public' | null>(null);
  const [mounted, setMounted]           = useState(false);
  const [canvasScale, setCanvasScale]   = useState(1);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const fitViewRef = useRef<FitViewFn | null>(null);
  const stageCanvasRef = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    setMounted(true);
    const name = getDisplayName();
    const participant = getParticipantState(boardId);
    if (name) {
      setAuthMode('owner');   // tentative; refined to owner/participant/public after board loads
    } else if (participant) {
      setAuthMode('participant');
    } else if (isPublicView) {
      setAuthMode('public');
    } else {
      router.replace(`/board/${boardId}/join`);
    }
  }, [boardId, isPublicView, router]);

  // Subscribe to all tables (SpacetimeDB filters happen server-side based on identity)
  const [boards]        = useTable(tables.board);
  const [participants]  = useTable(tables.participant);
  const [mediaItems]    = useTable(tables.media_item);
  const [watchEntries]  = useTable(tables.watch_entry);
  const [watchAggs]     = useTable(tables.watch_aggregate);

  const board = boards.find(b => b.id === boardId);

  // Refine authMode once board data arrives
  useEffect(() => {
    if (!board || !identityHex) return;
    if (board.ownerIdentity.toHexString() === identityHex) {
      setAuthMode('owner');
    } else if (participants.some(p => p.boardId === boardId && p.participantIdentity.toHexString() === identityHex)) {
      setAuthMode('participant');
    } else if (board.sharingMode === 'PUBLIC') {
      setAuthMode('public');
    } else {
      router.replace(`/board/${boardId}/join`);
    }
  }, [board, identityHex, participants, boardId, router]);

  // Reducers
  const setWatch        = useReducer(reducers.setWatch);
  const setWatchBulk    = useReducer(reducers.setWatchBulk);
  const removeMediaItem = useReducer(reducers.removeMediaItem);
  const updateMediaItemChrono = useReducer(reducers.updateMediaItemChrono);

  // Board-scoped data
  const boardItems = useMemo(
    () => mediaItems.filter(m => m.boardId === boardId),
    [mediaItems, boardId]
  );
  const boardParticipants = useMemo(
    () => participants.filter(p => p.boardId === boardId),
    [participants, boardId]
  );
  const boardWatchEntries = useMemo(
    () => watchEntries.filter(e => e.boardId === boardId),
    [watchEntries, boardId]
  );
  const boardWatchAggs = useMemo(
    () => watchAggs.filter(a => a.boardId === boardId),
    [watchAggs, boardId]
  );

  // Shape data for BoardCanvas
  const canvasItems: BoardMediaItem[] = useMemo(() =>
    boardItems.map(m => ({
      id: m.id,
      mediaType: m.mediaType,
      title: m.title,
      posterUrl: m.posterUrl,
      chronoOrder: m.chronoOrder,
      parentId: m.parentId,
      laneIndex: m.laneIndex,
      airDate: m.airDate,
    })),
    [boardItems]
  );

  const canvasParticipants: BoardParticipant[] = useMemo(() => {
    // Include owner as a participant
    const parts: BoardParticipant[] = boardParticipants.map(p => ({
      id: p.id,
      identityHex: p.participantIdentity.toHexString(),
      displayName: p.displayName,
    }));
    if (board && !parts.some(p => p.identityHex === board.ownerIdentity.toHexString())) {
      parts.unshift({
        id: 0n,
        identityHex: board.ownerIdentity.toHexString(),
        displayName: 'Owner',
      });
    }
    return parts;
  }, [boardParticipants, board]);

  const canvasWatchEntries: WatchEntryData[] = useMemo(() =>
    boardWatchEntries.map(e => ({
      mediaItemId: e.mediaItemId,
      watcherIdentity: e.watcherIdentity.toHexString(),
      watched: e.watched,
    })),
    [boardWatchEntries]
  );

  const canvasWatchAggs: WatchAggData[] = useMemo(() =>
    boardWatchAggs.map(a => ({
      mediaItemId: a.mediaItemId,
      watcherIdentity: a.watcherIdentity.toHexString(),
      watchedCount: a.watchedCount,
      totalCount: a.totalCount,
    })),
    [boardWatchAggs]
  );

  const existingTmdbIds = useMemo(
    () => new Set(boardItems.map(m => Number(m.tmdbId)).filter(id => id !== 0)),
    [boardItems]
  );

  const handleSetWatch = async (mediaItemId: bigint, watched: boolean) => {
    try {
      await setWatch({ boardId, mediaItemId, watched });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update watch status');
    }
  };

  const handleSetWatchBulk = async (ids: bigint[], watched: boolean) => {
    try {
      await setWatchBulk({ boardId, mediaItemIds: ids, watched });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to bulk update');
    }
  };

  const handleImport = async (tmdbId: number, mediaType: string) => {
    const conn = getConnection();
    if (!conn) throw new Error('Not connected');
    await importMedia(conn, boardId, tmdbId, mediaType as 'MOVIE' | 'TV_SHOW');
  };

  const handleRemoveItem = useCallback(async (mediaItemId: bigint) => {
    try {
      await removeMediaItem({ boardId, mediaItemId });
      toast.success('Removed from board');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove item');
    }
  }, [removeMediaItem, boardId]);

  const handleUpdateChrono = useCallback(async (mediaItemId: bigint, newChronoOrder: number) => {
    try {
      await updateMediaItemChrono({ boardId, mediaItemId, newChronoOrder });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reorder item');
    }
  }, [boardId]);

  const handleShare = async () => {
    if (!board) return;
    const url = `${window.location.origin}/board/${boardId}/join?invite=${board.inviteToken}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: board.title, text: `Join "${board.title}" on IHaveWatched`, url });
        return;
      }
    } catch {
      // user dismissed the share sheet — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const zoomLabel = getZoomLevel(canvasScale);

  if (!mounted) return null;
  if (!authMode) {
    // Still determining auth — show a loading state instead of blank
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme['card.bg'] }}>
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/75 backdrop-blur-xl px-3 sm:px-4 h-12 flex items-center gap-2 z-10 shrink-0">
          <div className="h-4 w-28 ui-skeleton" />
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-[var(--text-dim)]">
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm">Connecting…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme['card.bg'] }}>
      <ConnectionBanner />
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/75 backdrop-blur-xl
                         px-3 sm:px-4 h-12 flex items-center justify-between gap-2 z-10 shrink-0">
        {/* Left: back + title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" icon onClick={() => router.push('/')}
                  className="shrink-0"
                  title="Back to boards">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Button>
          <span className="text-[var(--border-strong)] select-none shrink-0 text-sm">/</span>
          <h1 className="font-medium text-sm text-[var(--text)] truncate max-w-[20ch] sm:max-w-[40ch]">
            {board?.title ?? `Board ${boardId}`}
          </h1>
          <span className="hidden md:inline-flex text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]
                           bg-[var(--surface-2)] text-[var(--text-dim)]
                           font-mono select-none shrink-0 tabular-nums">
            {zoomLabel}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {canvasItems.length > 0 && (
            <>
              <Button variant="ghost" size="sm" icon
                      title="Fit to view (double-click canvas)"
                      onClick={() => fitViewRef.current?.()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                </svg>
              </Button>
              <Button variant="ghost" size="sm" icon
                      title="Export as image"
                      onClick={() => {
                        if (stageCanvasRef.current) {
                          const dataUrl = stageCanvasRef.current.toDataURL({ pixelRatio: 2 });
                          const a = document.createElement('a');
                          a.href = dataUrl;
                          a.download = `${board?.title ?? 'board'}.png`;
                          a.click();
                        } else {
                          toast.error('Canvas not ready — try again');
                        }
                      }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </Button>
            </>
          )}
          {authMode === 'owner' && (
            <>
              <AddMediaSearch
                boardId={boardId}
                existingTmdbIds={existingTmdbIds}
                onImport={handleImport}
              />
              {/* Share + Settings hidden behind overflow menu on mobile */}
              <div className="hidden sm:flex items-center gap-1">
                <Button variant="ghost" size="sm" icon title="Share invite link" onClick={handleShare}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="sm" icon
                        title="Board settings"
                        onClick={() => router.push(`/board/${boardId}/settings`)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </Button>
              </div>
              {/* Mobile overflow menu */}
              <div className="sm:hidden relative" ref={overflowRef}>
                <Button variant="ghost" size="sm" icon title="More actions" onClick={() => setOverflowOpen(o => !o)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                  </svg>
                </Button>
                {overflowOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOverflowOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-solid)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] z-50 py-1 overflow-hidden">
                      <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors" onClick={() => { handleShare(); setOverflowOpen(false); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                        </svg>
                        Share invite link
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors" onClick={() => { router.push(`/board/${boardId}/settings`); setOverflowOpen(false); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        Board settings
                      </button>
                      <div className="border-t border-[var(--border)] my-1" />
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-sm text-[var(--text)]">Dark mode</span>
                        <ThemeToggle />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {authMode !== 'owner' && <ThemeToggle />}
          {authMode === 'public' && (
            <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-dim)] bg-[var(--surface-2)] px-2 py-1 rounded-[var(--radius-sm)]">
              View only
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {canvasItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[var(--text-dim)]">
            <div className="w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--surface-2)] flex items-center justify-center border border-[var(--border)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="text-center max-w-xs">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {authMode === 'owner'
                  ? 'Start adding media'
                  : 'No media items yet'}
              </p>
              <p className="text-xs text-[var(--text-soft)] mt-1 leading-relaxed">
                {authMode === 'owner'
                  ? 'Search for a movie or show using the search bar above.'
                  : 'The board owner hasn\'t added any media yet.'}
              </p>
            </div>
          </div>
        ) : (
          <BoardCanvas
            boardId={boardId}
            items={canvasItems}
            participants={canvasParticipants}
            watchEntries={canvasWatchEntries}
            watchAggs={canvasWatchAggs}
            myIdentityHex={identityHex}
            isOwner={authMode === 'owner'}
            isOwnerOrParticipant={authMode === 'owner' || authMode === 'participant'}
            theme={theme}
            onSetWatch={handleSetWatch}
            onSetWatchBulk={handleSetWatchBulk}
            onRemoveItem={authMode === 'owner' ? handleRemoveItem : undefined}
            onUpdateChrono={authMode === 'owner' ? handleUpdateChrono : undefined}
            onScaleChange={setCanvasScale}
            fitViewRef={fitViewRef}
            externalStageRef={stageCanvasRef}
          />
        )}
      </main>

      <footer className="text-center text-[10px] text-[var(--text-dim)] leading-none py-2.5 shrink-0 border-t border-[var(--border)]">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}

export default function BoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="h-screen flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-[var(--text-dim)]">
        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
  return <BoardPageInner />;
}
