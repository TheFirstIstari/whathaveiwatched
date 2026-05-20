'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex, getParticipantState } from '@/lib/db/connection';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { Button } from '@/components/ui/Button';
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
  const { getConnection } = useSpacetimeDB();

  const [identityHex, setIdentityHex_] = useState<string | null>(null);
  const [authMode, setAuthMode]         = useState<'owner' | 'participant' | 'public' | null>(null);
  const [mounted, setMounted]           = useState(false);
  const [canvasScale, setCanvasScale]   = useState(1);
  const fitViewRef = useRef<FitViewFn | null>(null);

  useEffect(() => {
    setMounted(true);
    const hex  = getIdentityHex();
    setIdentityHex_(hex);

    const name = getDisplayName();
    const participant = getParticipantState(boardId);
    if (name && hex) {
      setAuthMode('owner');   // tentative; refined after board loads
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

  const zoomLabel = getZoomLevel(canvasScale);

  if (!mounted || !authMode) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme['card.bg'] }}>
      <ConnectionBanner />
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>← Boards</Button>
          <span className="text-gray-200 dark:text-gray-700 select-none">|</span>
          <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
            {board?.title ?? `Board ${boardId}`}
          </h1>
          {/* Zoom level pill */}
          <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-mono select-none">
            {zoomLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Fit to view */}
          {canvasItems.length > 0 && (
            <Button variant="ghost" size="sm" title="Fit all to view" onClick={() => fitViewRef.current?.()}>
              ⊡
            </Button>
          )}
          {authMode === 'owner' && (
            <>
              <AddMediaSearch
                boardId={boardId}
                existingTmdbIds={existingTmdbIds}
                onImport={handleImport}
              />
              <Button variant="ghost" size="sm" onClick={() => router.push(`/board/${boardId}/settings`)}>
                Settings
              </Button>
            </>
          )}
          {authMode === 'public' && (
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              View only
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {canvasItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
            <p className="text-sm">
              {authMode === 'owner'
                ? 'Search for a movie or show to add it to the board.'
                : 'No media items yet.'}
            </p>
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
            onScaleChange={setCanvasScale}
            fitViewRef={fitViewRef}
          />
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-1.5 shrink-0 border-t border-gray-100 dark:border-gray-800">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}

export default function BoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>;
  return <BoardPageInner />;
}
