'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { episodeLabel } from '@/lib/episodeLabel';

interface MediaItemLike {
  id: bigint;
  mediaType: string;
  title: string;
  posterUrl: string;
  parentId: bigint;
}

interface WatchEntry {
  mediaItemId: bigint;
  watcherIdentity: string;
  watched: boolean;
}

interface Props {
  open: boolean;
  nodeId: bigint | null;
  onClose: () => void;
  items: MediaItemLike[];
  watchEntries: WatchEntry[];
  myIdentityHex: string | null;
  isOwnerOrParticipant: boolean;
  onSetWatch: (mediaItemId: bigint, watched: boolean) => void;
  onSetWatchBulk: (ids: bigint[], watched: boolean) => void;
}

export function DrillDownDrawer({
  open, nodeId, onClose, items, watchEntries, myIdentityHex, isOwnerOrParticipant, onSetWatch, onSetWatchBulk
}: Props) {
  const [hideWatched, setHideWatched] = useState(false);
  const node = items.find(i => i.id === nodeId);

  const tree = useMemo(() => {
    const map = new Map<bigint, MediaItemLike[]>();
    items.forEach(item => {
      const siblings = map.get(item.parentId) ?? [];
      siblings.push(item);
      map.set(item.parentId, siblings);
    });
    return map;
  }, [items]);

  const watchIdx = useMemo(() => {
    const idx = new Map<string, boolean>();
    watchEntries.forEach(e => {
      if (e.watcherIdentity === myIdentityHex) {
        idx.set(String(e.mediaItemId), e.watched);
      }
    });
    return idx;
  }, [watchEntries, myIdentityHex]);

  const groups = useMemo(() => {
    if (!nodeId) return [];
    const directChildren = tree.get(nodeId) ?? [];
    if (directChildren.every(c => c.mediaType === 'EPISODE' || c.mediaType === 'FILM')) {
      return [{ header: undefined as MediaItemLike | undefined, episodes: directChildren }];
    }
    return directChildren.map(group => ({
      header: group,
      episodes: tree.get(group.id) ?? [],
    }));
  }, [tree, nodeId]);

  const allLeafIds = useMemo(() => {
    const ids: bigint[] = [];
    groups.forEach(({ episodes }) => ids.push(...episodes.map(e => e.id)));
    return ids;
  }, [groups]);

  const watchedCount = allLeafIds.filter(id => watchIdx.get(String(id))).length;

  const epLabel = (ep: MediaItemLike) => episodeLabel(ep.title);

  const drawerClass = [
    'fixed right-0 top-0 h-screen w-full sm:w-[24rem] bg-[var(--surface-solid)]',
    'shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_32px_-4px_rgba(0,0,0,0.5)]',
    'transition-transform duration-300 ease-out z-[60] overflow-y-auto flex flex-col',
    'border-l border-[var(--border)]',
    open ? 'translate-x-0' : 'translate-x-full',
  ].join(' ');

  return (
    <>
      {/* Backdrop - click to close */}
      {open && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div className={drawerClass}>
        {/* Header */}
        <header className="sticky top-0 bg-[var(--surface-solid)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 h-12 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{node?.title ?? 'Details'}</h2>
            {allLeafIds.length > 0 && (
              <p className="text-[11px] text-[var(--text-dim)] mt-0.5 tabular-nums">
                <span className="text-[var(--accent)] font-medium">{watchedCount}</span>
                <span className="opacity-60"> / {allLeafIds.length} watched</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon onClick={onClose} title="Close"
                  className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </Button>
        </header>

        {/* Poster */}
        {node?.posterUrl && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={node.posterUrl} className="w-full object-cover max-h-40" alt={node.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-solid)] via-transparent to-transparent" />
          </div>
        )}

        {/* Progress bar */}
        {allLeafIds.length > 0 && (
          <div className="px-4 pt-3">
            <div className="h-1.5 rounded-[var(--radius-full)] bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-[var(--radius-full)] bg-[var(--success)] transition-all"
                   style={{ width: `${(watchedCount / allLeafIds.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Bulk actions + filter */}
        {isOwnerOrParticipant && allLeafIds.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <Button size="sm" className="flex-1" onClick={() => onSetWatchBulk(allLeafIds, true)}>
              ✓ Mark all
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onSetWatchBulk(allLeafIds, false)}>
              Reset
            </Button>
            <button
              className={`text-[10px] uppercase tracking-wider font-medium px-2 py-1.5 rounded-[var(--radius-sm)] transition-colors shrink-0
                          ${hideWatched
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
              onClick={() => setHideWatched(!hideWatched)}
              title={hideWatched ? 'Show watched episodes' : 'Hide watched episodes'}
            >
              {hideWatched ? 'Show all' : 'Hide ✓'}
            </button>
          </div>
        )}

        {/* Episode list */}
        <div className="flex-1 p-3 space-y-3">
          {groups.length === 0 && (
            <p className="text-sm text-[var(--text-dim)] text-center py-8">No episodes found</p>
          )}
          {groups.map(({ header, episodes }, gi) => {
            const groupWatched = episodes.filter(e => watchIdx.get(String(e.id))).length;
            const allWatched = groupWatched === episodes.length && episodes.length > 0;
            const visibleEps = hideWatched ? episodes.filter(e => !watchIdx.get(String(e.id))) : episodes;
            if (hideWatched && visibleEps.length === 0) return null;
            return (
              <div key={gi} className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
                {header && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] truncate">
                        {header.title}
                      </span>
                      {episodes.length > 0 && (
                        <span className="text-[10px] tabular-nums text-[var(--text-dim)] shrink-0">
                          {groupWatched}/{episodes.length}
                        </span>
                      )}
                    </div>
                    {isOwnerOrParticipant && episodes.length > 0 && (
                      <button
                        className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--accent)] font-medium transition-colors rounded-[var(--radius-sm)] px-1.5 py-0.5 hover:bg-[var(--surface-hover)]"
                        onClick={() => onSetWatchBulk(episodes.map(e => e.id), !allWatched)}
                      >
                        {allWatched ? 'Reset' : 'All'}
                      </button>
                    )}
                  </div>
                )}
                <div className="divide-y divide-[var(--border)]">
                  {visibleEps.map(ep => {
                    const watched = watchIdx.get(String(ep.id)) ?? false;
                    const label = epLabel(ep);
                    return (
                      <label
                        key={String(ep.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                                    ${watched
                                      ? 'bg-[var(--surface-2)]/50 text-[var(--text-dim)]'
                                      : 'hover:bg-[var(--surface-2)]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={watched}
                          onChange={e => isOwnerOrParticipant && onSetWatch(ep.id, e.target.checked)}
                          disabled={!isOwnerOrParticipant}
                          className="rounded accent-[var(--success)] w-3.5 h-3.5"
                        />
                        {label && (
                          <span className={`text-[10px] font-mono tabular-nums shrink-0 ${watched ? 'text-[var(--text-dim)]' : 'text-[var(--text-soft)]'}`}>
                            {label}
                          </span>
                        )}
                        <span className={`text-sm flex-1 truncate ${watched ? 'line-through opacity-60' : 'text-[var(--text)]'}`}>
                          {ep.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
